# SHINSIGHT — System Architecture

## Overview

SHINSIGHT is a 3-layer cryptographic system for sealed price prediction with on-chain settlement:

```
┌─────────────────────────────────────────────┐
│  Layer 1: Frontend (Next.js 16)              │
│  - Wallet connection, call forms             │
│  - Live feed, card animation, countdowns     │
├─────────────────────────────────────────────┤
│  Layer 2: Supabase Backend (Edge Functions) │
│  - Call encryption/decryption                │
│  - Key custody & access control (RLS)        │
│  - Cron oracle & settlement verification     │
├─────────────────────────────────────────────┤
│  Layer 3: Aptos Smart Contract (Move)        │
│  - Call registry & commitment hash           │
│  - Escrow pools & buyer deposits             │
│  - Settlement logic & fee distribution       │
└─────────────────────────────────────────────┘
```

## Layer 1: Frontend (Next.js)

**Technology:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui

**Key Components:**
- `/app/page.tsx` — Live feed (sealed + revealed calls)
- `/app/oracles/page.tsx` — KOL leaderboard by accuracy
- `/app/revealed/page.tsx` — Historical call archive
- `/components/calls/` — Card rendering (sealed, revealed, flip animations)
- `/lib/wallet.ts` — Aptos wallet adapter integration
- `/lib/api-client.ts` — Supabase client + edge function calls

**Key Libraries:**
- `@aptos-labs/ts-sdk` — Transaction building, type safety
- `@aptos-labs/wallet-adapter-react` — Multi-wallet support (Petra, etc.)
- `@supabase/supabase-js` — Auth + Edge Function invocation
- `lucide-react` — Icons
- `clsx` — Conditional class merging

**Data Flow:**
1. User connects wallet (Aptos testnet)
2. Frontend renders live feed via Supabase query
3. On call submission: Frontend calls `/submit-call` edge function
4. On unlock: Frontend calls `/unlock-key` edge function (requires payment)
5. On reveal: Frontend polls for settlement status, renders verdict

## Layer 2: Supabase Backend

**Technology:** Deno-based Edge Functions, PostgreSQL 15, Row-Level Security (RLS)

**Databases:**
- `calls` — Sealed call metadata (asset, direction, reveal_timestamp, unlock_price)
- `buyers` — Purchase records (buyer_address, call_id, unlock_timestamp)
- `keys` — Decryption keys (encrypted_call_data, decryption_key, iv)
- `kol_profile` — KOL reputation (total_calls, accurate, false, reputation_score)
- `settlement_log` — Oracle verdicts and escrow distribution

**Edge Functions:**
- `/submit-call` — KOL submits call, encrypts data, writes hash to contract
- `/unlock-key` — Buyer pays micro-fee, receives decryption key
- `/settle-call` — Cron job fetches Pyth oracle price, settles escrow
- `/link-call-onchain` — Monitors Aptos txn confirmation

**Encryption:**
- AES-256-GCM for sealed call data
- Keys held in Supabase (encrypted at rest)
- Public reveal: keys published at `reveal_timestamp` + margin

**RLS Policies:**
- Only call creator can view encrypted call_data
- Only buyer can view their unlock_key (before public reveal)
- Settlement data readable by all (audit trail)

## Layer 3: Aptos Smart Contract (Move)

**Network:** Aptos testnet
**Version:** Move 2025 (supports packages, vector, simple_map)

**Three Core Modules:**

### 1. `call_registry.move`
Manages call lifecycle and commitment hashes.

```
struct Call {
  call_id: u64,
  kol: address,
  content_hash: vector<u8>,  // SHA256 of plaintext call
  reveal_timestamp: u64,
  unlock_price: u64,
  is_revealed: bool,
  verdict: Option<bool>,
}
```

- `create_call()` — Register new call with hash
- `reveal_call(verdict)` — Mark as revealed; only oracle can call
- Events: CallCreated, CallRevealed

### 2. `escrow.move`
Holds buyer deposits and executes settlement.

```
struct EscrowPool {
  call_id: u64,
  coins: Coin<AptosCoin>,      // APT holdings
  buyers: vector<BuyerDeposit>, // Buyer amounts
  total_deposited: u64,
  is_settled: bool,
}

struct BuyerDeposit {
  buyer: address,
  amount: u64,
}
```

- `deposit(call_id, amount)` — Buyer locks APT
- `settle(verdict)` — Oracle triggers settlement
  - TRUE: KOL receives 70%; buyers split 30% — 10% protocol fee
  - FALSE: KOL receives 30%; buyers split 70% — 10% protocol fee
- Events: Deposited, Settled

### 3. `oracle_settlement.move`
Authorizes oracle account to settle calls.

- `authorize_oracle(oracle_addr)` — Owner permission
- `is_authorized(addr)` — Verify oracle eligibility
- Events: OracleAuthorized

## Data Flow: Full Lifecycle

### 1. Commitment (KOL Action)

```
KOL fills form:
  Asset=ETH, Direction=UP, Target=2500, Reveal=+48h, Unlock=0.5 APT

Frontend calls submit-call:
  - Encrypts plaintext call data (AES-256-GCM)
  - Computes SHA256(plaintext) = content_hash
  - Stores encrypted call + hash in Supabase
  - Submits TXN to call_registry::create_call(content_hash, reveal_timestamp)
  - On-chain call_id created

Live feed displays sealed card:
  - Shows: Asset, Direction, Unlock price, Countdown
  - Hides: Target price, Rationale
```

### 2. Buyer Unlock

```
Buyer clicks "Unlock" on sealed card:
  - Frontend opens payment dialog (0.5 APT)
  - User approves wallet signature
  - Frontend calls unlock-key edge function with:
    { call_id, buyer_address, unlock_price, signature }

Supabase verifies:
  - Wallet signature valid
  - Payment amount matches unlock_price
  - Call not yet revealed

Response:
  - Decryption key (served privately)
  - Buyer record logged to DB

Frontend:
  - Caches key locally
  - Decrypts call data client-side
  - Displays target price + optional rationale
```

### 3. Reveal (Automatic)

```
At reveal_timestamp:
  - Oracle cron job triggers settle-call function
  - Fetches Pyth Network price feed for asset
  - Compares price vs. target + direction
  - Verdict: TRUE or FALSE

Oracle submits:
  - TXN to oracle_settlement::settle(call_id, verdict)
  - call_registry marked as revealed
  - escrow pool executes distribution

Supabase:
  - Logs settlement to settlement_log
  - Updates KOL reputation score
  - Publishes decryption key publicly

Frontend:
  - Polls for settlement status
  - Animates card reveal (sealed → verdict stripe)
  - Shows distribution breakdown
```

## External Integrations

| Service | Use Case | Auth |
|---------|----------|------|
| **Pyth Network (Aptos)** | Real-time price feeds | On-chain oracle |
| **Aptos Node RPC** | Contract deployment + calls | Public testnet |
| **Telegram Bot API** | Notifications | Webhook token |

## Security Model

**Attack Prevention:**
- **Retroactive edits:** SHA256 hash on-chain prevents plaintext tampering
- **Key leak:** RLS ensures only authorized parties access keys; AES-256 prevents plaintext exposure
- **Oracle manipulation:** Pyth feeds are decentralized; Supabase can't unilaterally change verdict
- **KOL reputation gaming:** Settlement records immutable on-chain; reputation tied to on-chain settlement events

**Data Protection:**
- All Supabase tables enforce RLS by default
- Encrypted call_data never logged in plaintext
- Decryption keys held separately from encrypted data
- Contract RLS ensures only authorized oracle can settle

## Performance Targets

| Operation | Target Latency | Notes |
|-----------|-----------------|-------|
| Card render | < 500ms | Live feed, grid view |
| Unlock key fetch | < 1s | Edge function warm start |
| Settlement (oracle) | < 2min | Pyth feed latency + Aptos block time |
| Leaderboard query | < 500ms | Indexed on KOL reputation |

## Monitoring & Observability

- **Supabase:** Built-in logs for edge functions + DB
- **Aptos:** Contract events (CallCreated, Revealed, Settled)
- **Frontend:** Error boundary + Sentry integration (future)
- **Telegram Bot:** Alerts for settlement failures

## Scalability Considerations

- **Concurrent Users:** Load balancing via Supabase + Cloudflare
- **Call Volume:** Aptos testnet handles 1,000+ TXNs/second
- **DB Growth:** Postgres partitioning by reveal_timestamp for archival
- **Edge Functions:** Auto-scale based on traffic
