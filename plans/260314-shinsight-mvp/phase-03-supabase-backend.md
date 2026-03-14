# Phase 3 — Supabase Backend

## Overview

- **Priority:** P1
- **Duration:** 5 days (Week 3)
- **Status:** Pending
- **Goal:** Schema, Edge Functions for key custody/unlock/settlement trigger, pg_cron polling

## Context Links

- [Plan Overview](plan.md) | [Phase 2](phase-02-smart-contract.md)
- [Oracle Research](../reports/researcher-260313-2323-oracle-architecture-patterns.md)
- [PRD Sections 4-6](../../PRD_SHINSIGHT.md)

## Key Insights

- Supabase holds encrypted call blob + decryption key — contract holds hash only
- Buyer pays on-chain → Edge Function verifies tx via Aptos RPC → serves decryption key
- pg_cron polls every 30s for calls past revealTimestamp → triggers settle Edge Function
- Edge Function submits Pyth VAA + settle() call to contract
- AES-256-GCM for call encryption; master key in Supabase secrets
- RLS: anon can read public call fields; service_role only for keys/oracle ops

## Requirements

### Functional
- Store encrypted call data + decryption key on KOL submission
- Verify on-chain buyer payment, serve decryption key to buyer
- Poll for due reveals, trigger settlement on contract
- Publish decryption key publicly at reveal time
- Track KOL accuracy stats (win/loss/expired counts)
- Settlement audit log (immutable)

### Non-Functional
- Edge Functions complete within 30s (well under 150s limit)
- RLS prevents unauthorized key access
- All sensitive operations use service_role key only

## Architecture

```
pg_cron (30s) --> check_due_reveals() SQL fn
    |
    v
Edge Function: settle-call
    ├── Read call data from Postgres
    ├── Fetch Pyth VAA from Hermes API
    ├── Submit settle() tx to Aptos devnet
    ├── On success: publish decryption key, update status
    └── On failure: log error, retry next cycle

Edge Function: unlock-key
    ├── Receive buyer address + call_id
    ├── Verify on-chain deposit via Aptos RPC
    ├── Serve decryption key (signed response)
    └── Record buyer in buyers table

Edge Function: submit-call
    ├── Receive structured call from KOL
    ├── Encrypt call data (AES-256-GCM)
    ├── Store encrypted blob + key
    ├── Return content_hash for on-chain commit
    └── (KOL then submits hash to contract via wallet)
```

## Database Schema

```sql
-- calls: core call metadata (mirrors on-chain data + encrypted content)
CREATE TABLE calls (
  id BIGSERIAL PRIMARY KEY,
  call_id_onchain BIGINT UNIQUE,         -- matches contract call ID
  kol_address TEXT NOT NULL,
  asset SMALLINT NOT NULL,               -- 0=BTC,1=ETH,2=SOL,3=BNB,4=APT
  direction BOOLEAN NOT NULL,            -- true=UP, false=DOWN
  target_price BIGINT NOT NULL,          -- USD * 10^8
  reveal_timestamp TIMESTAMPTZ NOT NULL,
  unlock_price BIGINT NOT NULL,          -- octas
  content_hash TEXT NOT NULL,            -- SHA3-256 hex
  encrypted_blob TEXT NOT NULL,          -- AES-256-GCM ciphertext
  decryption_key TEXT NOT NULL,          -- AES key (hidden by RLS)
  encryption_iv TEXT NOT NULL,           -- nonce
  status TEXT DEFAULT 'active',          -- active/settled_true/settled_false/expired
  is_revealed BOOLEAN DEFAULT FALSE,
  settlement_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- buyers: tracks who unlocked which call
CREATE TABLE buyers (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES calls(id),
  buyer_address TEXT NOT NULL,
  deposit_tx_hash TEXT NOT NULL,
  key_delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, buyer_address)
);

-- kol_stats: accuracy tracking (updated after each settlement)
CREATE TABLE kol_stats (
  kol_address TEXT PRIMARY KEY,
  total_calls INT DEFAULT 0,
  true_calls INT DEFAULT 0,
  false_calls INT DEFAULT 0,
  expired_calls INT DEFAULT 0,
  total_escrow_earned BIGINT DEFAULT 0,  -- octas
  current_streak INT DEFAULT 0,          -- positive=wins, negative=losses
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- settlement_log: immutable audit trail
CREATE TABLE settlement_log (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES calls(id),
  verdict TEXT NOT NULL,
  oracle_price BIGINT,
  target_price BIGINT,
  total_escrow BIGINT,
  kol_payout BIGINT,
  buyer_refund_per BIGINT,
  protocol_fee BIGINT,
  tx_hash TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- Public: read all fields EXCEPT decryption_key, encryption_iv
CREATE POLICY "public_read_calls" ON calls FOR SELECT
  USING (true);
-- Hide sensitive columns via view instead:
CREATE VIEW public_calls AS
  SELECT id, call_id_onchain, kol_address, asset, direction,
         reveal_timestamp, unlock_price, content_hash, status,
         is_revealed, created_at,
         CASE WHEN is_revealed THEN target_price ELSE NULL END as target_price
  FROM calls;
```

## Related Code Files (to create)

- `supabase/migrations/001_create_tables.sql` — schema above
- `supabase/functions/submit-call/index.ts` — encrypt + store call
- `supabase/functions/unlock-key/index.ts` — verify payment + serve key
- `supabase/functions/settle-call/index.ts` — Pyth VAA + contract settle
- `supabase/functions/_shared/aptos-client.ts` — Aptos RPC helper
- `supabase/functions/_shared/encryption.ts` — AES-256-GCM utils
- `supabase/seed.sql` — test data for local dev

## Implementation Steps

### Day 1: Schema + RLS

1. Create migration file with all tables
2. Set up RLS policies — anon reads public_calls view only
3. Create service_role-only policies for writes
4. Run `supabase db reset` to verify migration
5. Create seed.sql with 3 test KOLs and sample calls

### Day 2: submit-call Edge Function

6. Implement AES-256-GCM encryption utility:
   ```typescript
   // _shared/encryption.ts
   export function encryptCallData(plaintext: string): {
     ciphertext: string; key: string; iv: string;
   }
   ```
7. Edge Function flow:
   - Receive: `{ asset, direction, target_price, reveal_timestamp, unlock_price }`
   - Generate random AES key + IV
   - Encrypt JSON payload → ciphertext
   - Compute SHA3-256 hash of plaintext JSON (deterministic serialization)
   - Insert into `calls` table
   - Return `{ call_id, content_hash }` — KOL uses this for on-chain commit

### Day 3: unlock-key Edge Function

8. Implement Aptos RPC verification:
   ```typescript
   // _shared/aptos-client.ts
   export async function verifyDeposit(
     buyerAddress: string, callIdOnchain: number
   ): Promise<boolean>
   // Checks BuyerDepositEvent on contract for this buyer+call
   ```
9. Edge Function flow:
   - Receive: `{ call_id, buyer_address, tx_hash }`
   - Verify tx_hash on Aptos RPC — confirm deposit event
   - Check buyer not already in `buyers` table
   - Fetch decryption_key from `calls`
   - Insert buyer record with `key_delivered = true`
   - Return `{ decryption_key, encrypted_blob }` (buyer decrypts client-side)

### Day 4: settle-call Edge Function + pg_cron

10. Implement settlement trigger:
    ```typescript
    // settle-call/index.ts
    // 1. Query calls WHERE reveal_timestamp <= NOW() AND status = 'active'
    // 2. For each call:
    //    a. Fetch Pyth VAA from Hermes: GET https://hermes.pyth.network/v2/updates/price/latest?ids[]=<price_id>
    //    b. Build settle() transaction with VAA as argument
    //    c. Sign with oracle private key (from env), submit to Aptos
    //    d. On success: update calls.status, insert settlement_log
    //    e. Set is_revealed=true (publishes decryption key)
    //    f. Update kol_stats (increment win/loss/expired)
    ```

11. Handle EXPIRED:
    ```typescript
    // If reveal_timestamp + 3600 < NOW() AND status still 'active':
    //   Call expire() on contract instead
    //   Update status = 'expired', refund buyers
    ```

12. Set up pg_cron:
    ```sql
    SELECT cron.schedule(
      'check-due-reveals',
      '30 seconds',
      $$SELECT net.http_post(
        url := 'https://<project>.supabase.co/functions/v1/settle-call',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      )$$
    );
    ```

### Day 5: Testing + Integration

13. Test submit-call: create call → verify encrypted blob + hash
14. Test unlock-key: mock deposit verification → confirm key delivery
15. Test settle-call: mock Pyth response → verify status update + stats
16. Test pg_cron: insert a call with past reveal_timestamp → verify auto-trigger
17. Verify settlement_log entries for audit trail

## Todo List

- [ ] Create migration with all tables + RLS
- [ ] Implement encryption utils (AES-256-GCM)
- [ ] Implement Aptos RPC client helper
- [ ] Build submit-call Edge Function
- [ ] Build unlock-key Edge Function
- [ ] Build settle-call Edge Function
- [ ] Configure pg_cron for 30s polling
- [ ] Handle EXPIRED path in settle-call
- [ ] Update kol_stats on settlement
- [ ] Test all Edge Functions locally
- [ ] Create seed data for dev

## Success Criteria

- submit-call returns valid content_hash matching on-chain commitment
- unlock-key verifies real devnet deposit and serves key
- settle-call reads Pyth price and triggers contract settlement
- pg_cron fires every 30s and processes due calls
- kol_stats accurately reflects win/loss/expired counts
- settlement_log has complete audit trail

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pyth Hermes API downtime | MEDIUM | 1hr grace before EXPIRED; retry next 30s cycle |
| Oracle private key exposure | HIGH | Store in Supabase secrets, never in code/DB |
| pg_cron timing drift | LOW | 30s poll with 1hr grace is very forgiving |
| Edge Function cold starts | LOW | 30s cycle keeps containers warm |

## Security Considerations

- Oracle private key: Supabase secrets only (`ORACLE_PRIVATE_KEY`)
- Master encryption key: Supabase secrets (`MASTER_KEY_SECRET`)
- RLS: `public_calls` view hides target_price until revealed, hides keys always
- Buyer key delivery: verify on-chain payment before serving
- Settlement idempotency: check `is_settled` before processing
- Rate limit unlock-key to prevent brute-force

## Next Steps

- Proceed to [Phase 4 — Frontend Core](phase-04-frontend-core.md)
- Provide Edge Function URLs + Supabase URL to frontend config
