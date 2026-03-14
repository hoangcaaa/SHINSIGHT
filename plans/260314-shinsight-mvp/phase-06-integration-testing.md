# Phase 6 — Integration & Testing

## Overview

- **Priority:** P1
- **Duration:** 5 days (Week 6)
- **Status:** Pending
- **Goal:** End-to-end flow on devnet, bug fixes, demo preparation

## Context Links

- [Plan Overview](plan.md) | [Phase 5](phase-05-frontend-screens.md)
- [PRD Success Criteria](../../PRD_SHINSIGHT.md)

## Key Insights

- Integration testing = validating the full loop across 3 layers (contract ↔ Supabase ↔ frontend)
- Most bugs will surface at layer boundaries: Edge Function ↔ Aptos RPC, wallet tx ↔ contract
- Demo needs 3+ test KOLs with varied outcomes (TRUE, FALSE, EXPIRED) to showcase all states
- Pyth devnet price feeds may differ from mainnet — verify feed IDs work
- pg_cron timing is the weakest link — test with real 30s cycles, not mocked

## Requirements

### Functional
- Complete E2E flow: KOL seals → buyer unlocks → settlement executes → cards flip
- All 3 verdict paths work end-to-end
- Demo dataset: 3 KOLs, 10+ calls across all verdict states
- Error recovery: failed tx retried, failed settlement logged

### Non-Functional
- Full cycle completes within 5 minutes (seal → settle) using short reveal times
- No console errors in production build
- Demo runs without manual intervention (pg_cron handles settlement)

## Architecture

### Test Matrix

```
Layer Boundary Tests:
  Frontend → Contract:   wallet deposit tx, create_call tx
  Frontend → Supabase:   submit-call, unlock-key API calls
  Supabase → Contract:   settle-call tx submission
  Supabase → Pyth:       Hermes VAA fetch
  Contract → Pyth:       on-chain price read during settle()
  pg_cron  → Edge Fn:    automatic trigger on due calls
```

## Implementation Steps

### Day 1: Contract Integration Verification

1. **Deploy fresh contract** to devnet:
   ```bash
   cd contract
   aptos move publish --named-addresses shinsight=default --network devnet
   ```

2. **CLI smoke test** — full cycle:
   ```bash
   # Create call (reveal in 5 minutes for testing)
   aptos move run --function-id <addr>::call_registry::create_call \
     --args hex:<content_hash> u8:0 bool:true u64:<target> u64:<reveal_ts> u64:10000000

   # Deposit as buyer (use second account)
   aptos move run --function-id <addr>::escrow::deposit --args u64:<call_id>

   # Wait for reveal_timestamp to pass...

   # Settle (with Pyth VAA)
   aptos move run --function-id <addr>::oracle_settlement::settle \
     --args u64:<call_id> 'vector<hex>:<pyth_vaa>'
   ```

3. **Verify on-chain state** after each step:
   - Call exists in registry with correct status
   - EscrowPool has buyer deposit
   - After settle: funds split correctly, status updated

4. **Test EXPIRED path**:
   ```bash
   # Create call with reveal 2 minutes ago
   # Wait 1 hour (or mock timestamp in test)
   aptos move run --function-id <addr>::oracle_settlement::expire --args u64:<call_id>
   ```

### Day 2: Supabase Integration Verification

5. **Test submit-call Edge Function**:
   ```bash
   curl -X POST https://<project>.supabase.co/functions/v1/submit-call \
     -H "Authorization: Bearer <anon_key>" \
     -H "Content-Type: application/json" \
     -d '{"asset":0,"direction":true,"target_price":7000000000000,"reveal_timestamp":"...","unlock_price":10000000}'
   # Verify: returns content_hash, encrypted blob in DB
   ```

6. **Test unlock-key Edge Function**:
   - Create a real deposit tx on devnet
   - Call unlock-key with tx_hash
   - Verify: decryption key returned, buyer row created
   - Verify: decrypted blob matches original call data

7. **Test settle-call Edge Function**:
   - Insert a call with past reveal_timestamp
   - Manually invoke settle-call
   - Verify: Pyth VAA fetched, settle tx submitted, status updated
   - Verify: settlement_log entry created
   - Verify: kol_stats updated

8. **Test pg_cron trigger**:
   - Insert call with reveal 1 minute from now
   - Wait for pg_cron to fire (within 30s of reveal)
   - Verify: settlement triggered automatically

### Day 3: Frontend Integration

9. **Wallet connect flow**:
   - Connect Petra wallet
   - Verify address shows in header
   - Disconnect and reconnect

10. **Seal Call E2E**:
    - Open Seal Call modal
    - Fill form: BTC, UP, $70,000, reveal in 10 min, 0.5 APT
    - Preview step: verify sealed card preview
    - Commit: wallet signs tx, call appears in Live Feed
    - Verify: card shows correct countdown, asset, direction

11. **Unlock E2E**:
    - Switch to buyer wallet
    - Click Unlock on sealed card
    - Approve deposit tx in wallet
    - Verify: target price appears in card
    - Verify: buyer count increments

12. **Settlement E2E** (wait for reveal):
    - Wait for countdown to expire
    - Verify: pg_cron triggers settlement
    - Verify: card flips from sealed to revealed
    - Verify: verdict stripe shows correct color
    - Check Revealed page: card appears with settlement data
    - Check Oracles page: KOL stats updated

### Day 4: Demo Dataset + Edge Cases

13. **Create demo dataset** — 3 KOL wallets:
    ```
    KOL "Alpha":  4 TRUE, 1 FALSE, 0 EXPIRED  → 80% accuracy
    KOL "Beta":   2 TRUE, 2 FALSE, 1 EXPIRED  → 40% accuracy
    KOL "Gamma":  1 TRUE, 0 FALSE, 0 EXPIRED  → 100% accuracy (new)
    ```
    - Use short reveal times (5-10 min) to generate settled calls quickly
    - Ensure each verdict type represented
    - Vary assets (BTC, ETH, SOL) and directions

14. **Edge case testing**:
    - [ ] Unlock a call that's already been revealed (should show data, no charge)
    - [ ] Double-deposit by same buyer (contract should reject)
    - [ ] Settle a call with 0 buyers (should handle gracefully)
    - [ ] Disconnect wallet mid-transaction (should show error, allow retry)
    - [ ] Network switch (mainnet vs devnet) — show warning if wrong network
    - [ ] Call with unlock_price exactly 0.1 APT (minimum boundary)
    - [ ] Call with reveal in exactly 1 hour (minimum boundary)

15. **Error handling verification**:
    - Simulate Pyth Hermes timeout → verify retry on next cron cycle
    - Simulate Aptos RPC error → verify error logged, retry works
    - Invalid wallet state → verify user-friendly error messages

### Day 5: Polish + Demo Prep

16. **Visual polish pass**:
    - Verify all colors match spec (#0C0B09, #EF9F27, verdict colors)
    - Check font rendering (Playfair Display headings, Courier New data)
    - Verify card animations smooth at 60fps
    - Test hatching overlay renders correctly
    - Verify golden glow hover effect

17. **Production build test**:
    ```bash
    cd web
    npm run build   # Verify no build errors
    npm start       # Test production server
    ```

18. **Demo script** — write down exact steps:
    ```
    1. Open Live Feed — show 3 sealed cards from different KOLs
    2. Connect wallet (Petra)
    3. Unlock a sealed card — show deposit + reveal flow
    4. Navigate to Revealed — show settled calls with verdicts
    5. Navigate to Oracles — show KOL leaderboard
    6. Seal a new call — show 3-step KOL flow
    7. Wait for settlement — show card flip animation
    ```

19. **Record backup** — screen recording of full demo flow in case live demo fails

20. **Final checklist**:
    - [ ] All 3 verdict types visible in Revealed page
    - [ ] Oracles page shows 3 KOLs ranked by accuracy
    - [ ] Seal Call modal completes without errors
    - [ ] Unlock flow delivers decryption key
    - [ ] pg_cron settles calls within 30s of reveal
    - [ ] No console errors in production build
    - [ ] Mobile layout passable (not broken)

## Todo List

- [ ] Deploy fresh contract to devnet
- [ ] CLI smoke test: full create → deposit → settle cycle
- [ ] Test all 3 Edge Functions against real devnet
- [ ] Verify pg_cron auto-triggers settlement
- [ ] Full E2E: seal → unlock → settle via frontend
- [ ] Card flip animation works on real settlement
- [ ] Create demo dataset (3 KOLs, 10+ calls)
- [ ] Test all edge cases (double deposit, 0 buyers, etc.)
- [ ] Error handling for network failures
- [ ] Visual polish pass (colors, fonts, animations)
- [ ] Production build succeeds with no errors
- [ ] Write demo script
- [ ] Record backup demo video
- [ ] Final checklist complete

## Success Criteria

- Full E2E loop works: seal → display → unlock → settle → reveal → stats update
- All 3 verdict paths (TRUE/FALSE/EXPIRED) demonstrated end-to-end
- Demo dataset shows meaningful leaderboard (3 KOLs, varied accuracy)
- pg_cron auto-settles within 30s of reveal timestamp
- No manual intervention needed during demo flow
- Production build clean, no console errors

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pyth devnet feed IDs wrong | HIGH | Verify each feed ID on Pyth explorer before demo |
| pg_cron misses reveal in demo | MEDIUM | Have manual settle-call curl as backup |
| Wallet extension update breaks adapter | LOW | Pin wallet adapter version, test day-of |
| Devnet congestion slows tx | LOW | Fund account generously, retry logic in Edge Fn |
| Demo dataset generation slow | LOW | Script it — batch create calls with short reveals |

## Security Considerations

- Demo wallets use devnet APT only — no real funds at risk
- Oracle private key stored in Supabase secrets, never exposed in demo
- .env files excluded from any screen recordings
- Demo script avoids showing admin/service keys

## Next Steps (Post-MVP)

- Phase 2 features: soulbound reputation token, KOL tier system
- Migrate pg_cron to Railway dedicated service for reliability
- Mainnet deployment planning + security audit
- Rationale note support (encrypted optional text)
