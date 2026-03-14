# Phase 2 — Smart Contract (Move)

## Overview

- **Priority:** P1 — CRITICAL PATH
- **Duration:** 10 days (Week 1-2)
- **Status:** Pending
- **Goal:** Deploy escrow + settlement + call registry on Aptos devnet with Pyth oracle

## Context Links

- [Plan Overview](plan.md) | [Phase 1](phase-01-project-setup.md)
- [Aptos Ecosystem Research](../reports/researcher-260313-2323-aptos-ecosystem-template-research.md)
- [Oracle Research](../reports/researcher-260313-2323-oracle-architecture-patterns.md)
- Reference repos: `dhruvja/aptos-escrow`, `move-by-examples/fungible-asset-vesting`

## Key Insights

- No off-the-shelf fractional escrow exists — must build custom
- Pyth price update + settlement can be same tx (caller passes price update VAA)
- Coin v1 still works (auto-paired with FA) — use it for simplicity in MVP
- Move's linear type system prevents double-spend by design
- Settlement must be idempotent — re-calling settle on already-settled call is a no-op
- Staleness check: reject Pyth price if >5 min old

## Requirements

### Functional
- KOL commits call: hash + revealTimestamp + unlockPrice stored on-chain
- Buyers deposit unlockPrice APT into escrow per call
- Settlement reads Pyth, computes verdict, splits funds
- TRUE: 90% distributable to KOL (10% protocol fee)
- FALSE: 27% KOL, 63% buyers, 10% protocol
- EXPIRED: 100% to buyers (0% KOL, 0% protocol)
- Min unlock price: 0.1 APT enforced in contract
- Min reveal gap: 1 hour from submission

### Non-Functional
- All entry functions emit events for frontend indexing
- Unit tests cover all 3 verdict paths + edge cases
- Contract upgradeable via resource account pattern

## Architecture

### Module Dependency

```
call_registry.move  (standalone — stores call metadata)
       |
       v
escrow.move         (imports call_registry — holds/splits funds)
       |
       v
oracle_settlement.move  (imports escrow + call_registry + Pyth — verdict logic)
```

### Data Structures

```move
// call_registry.move
struct Call has key, store {
    id: u64,
    kol: address,
    content_hash: vector<u8>,    // SHA3-256 of plaintext call
    asset: u8,                   // 0=BTC, 1=ETH, 2=SOL, 3=BNB, 4=APT
    direction: bool,             // true=UP, false=DOWN
    target_price: u64,           // USD price * 10^8 (Pyth format)
    reveal_timestamp: u64,       // Unix seconds
    unlock_price: u64,           // APT in octas (1 APT = 10^8 octas)
    status: u8,                  // 0=ACTIVE, 1=SETTLED_TRUE, 2=SETTLED_FALSE, 3=EXPIRED
    created_at: u64,
}

// escrow.move
struct EscrowPool has key {
    call_id: u64,
    coins: Coin<AptosCoin>,
    buyer_deposits: SimpleMap<address, u64>,
    buyer_count: u64,
    total_deposited: u64,
    is_settled: bool,
}

// oracle_settlement.move — no persistent state, pure logic
```

### Pyth Price Feed IDs (devnet)

```
BTC/USD: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
ETH/USD: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
SOL/USD: 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
APT/USD: 0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5
BNB/USD: 0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f
```

## Related Code Files (to create)

- `contract/sources/call_registry.move` — call metadata + commit
- `contract/sources/escrow.move` — deposit, split, refund
- `contract/sources/oracle_settlement.move` — Pyth read + verdict + execute
- `contract/tests/test_settlement.move` — E2E settlement tests
- `contract/tests/test_escrow.move` — deposit/refund tests
- `contract/tests/test_call_registry.move` — commit/immutability tests

## Implementation Steps

### Day 1-2: call_registry.move

1. Define `Call` struct + `CallStore` resource (vector of calls)
2. Entry fn `create_call(signer, content_hash, asset, direction, target_price, reveal_timestamp, unlock_price)`
   - Assert `unlock_price >= 10_000_000` (0.1 APT in octas)
   - Assert `reveal_timestamp >= now + 3600` (1 hour minimum)
   - Assert `asset <= 4` (valid asset enum)
   - Store Call, emit `CallCreatedEvent`
3. View fn `get_call(call_id): Call`
4. Internal fn `update_status(call_id, new_status)` — friend-only for oracle_settlement
5. Tests: create call, reject invalid inputs, verify immutability

### Day 3-5: escrow.move

6. Define `EscrowPool` resource
7. Entry fn `deposit(signer, call_id)`
   - Read `unlock_price` from call_registry
   - Assert call status == ACTIVE
   - Assert `timestamp::now_seconds() < reveal_timestamp`
   - Withdraw `unlock_price` octas from buyer
   - Add to pool, increment buyer_count
   - Emit `BuyerDepositEvent`
8. Internal fn `execute_settlement(call_id, verdict)` — friend-only
   - Calculate splits based on verdict:
     ```
     protocol_fee = total * 10 / 100
     distributable = total - protocol_fee
     if TRUE:  kol_payout = distributable
     if FALSE: kol_payout = distributable * 30 / 100
               buyer_refund_total = distributable * 70 / 100
     if EXPIRED: buyer_refund_total = total (no protocol fee)
     ```
   - Transfer KOL payout to KOL address
   - Calculate per-buyer refund: `buyer_refund_total / buyer_count`
   - Transfer protocol fee to protocol address
   - Mark `is_settled = true`
   - Emit `SettlementEvent`
9. Internal fn `refund_all(call_id)` — for EXPIRED path
10. Tests: deposit, double-deposit prevention, settlement math for all 3 verdicts

### Day 6-8: oracle_settlement.move

11. Entry fn `settle(signer, call_id, pyth_price_update: vector<vector<u8>>)`
    - Assert caller is authorized oracle (protocol admin)
    - Read call from registry — assert status == ACTIVE
    - Assert `timestamp::now_seconds() >= reveal_timestamp`
    - Map `call.asset` to Pyth price feed ID
    - Pay Pyth update fee, call `pyth::update_price_feeds()`
    - Read price: `pyth::get_price(price_id)`
    - **Staleness check:** assert price timestamp within 300 seconds
    - Compare: apply direction logic
      ```
      if direction == UP:  verdict = (price >= target_price)
      if direction == DOWN: verdict = (price <= target_price)
      ```
    - Call `escrow::execute_settlement(call_id, verdict)`
    - Call `call_registry::update_status(call_id, verdict_status)`
    - Emit `VerdictEvent { call_id, price, target, verdict }`

12. Entry fn `expire(signer, call_id)`
    - Assert `timestamp::now_seconds() >= reveal_timestamp + 3600` (1hr grace)
    - Assert status == ACTIVE
    - Call `escrow::refund_all(call_id)`
    - Call `call_registry::update_status(call_id, EXPIRED)`
    - Emit `ExpiredEvent`

13. Helper fn `get_price_feed_id(asset: u8): vector<u8>` — hardcoded mapping

### Day 9-10: Testing + Devnet Deploy

14. Write comprehensive tests:
    - Happy path: create -> deposit -> settle TRUE -> verify KOL gets 90%
    - FALSE path: verify 30/70 split
    - EXPIRED path: verify 100% refund
    - Edge: settle before reveal_timestamp (should fail)
    - Edge: double settlement (should no-op or fail)
    - Edge: deposit after reveal (should fail)
    - Edge: 0 buyers settle (should handle gracefully)

15. Deploy to devnet:
    ```bash
    aptos move publish --named-addresses shinsight=default --network devnet
    ```

16. Smoke test via CLI:
    ```bash
    aptos move run --function-id <addr>::call_registry::create_call --args ...
    ```

## Todo List

- [ ] Implement call_registry.move with create_call + events
- [ ] Implement escrow.move with deposit + settlement splits
- [ ] Implement oracle_settlement.move with Pyth integration
- [ ] Write unit tests for all 3 verdict paths
- [ ] Test edge cases (timing, double-spend, 0 buyers)
- [ ] Deploy to devnet
- [ ] Smoke test create -> deposit -> settle flow via CLI
- [ ] Document deployed contract address

## Success Criteria

- `aptos move test` passes all tests (3 verdict paths + edges)
- Contract deployed on devnet with funded account
- CLI smoke test: full create->deposit->settle cycle works
- Events emitted for all state changes

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Move learning curve | HIGH | Follow dhruvja pattern closely, start with simplest module |
| Pyth devnet availability | MEDIUM | Mock Pyth in unit tests, test real integration separately |
| Fractional math rounding | MEDIUM | Use integer division, test with edge amounts (1 buyer, 999 buyers) |
| Friend function complexity | LOW | Keep module boundaries clean, minimize cross-module calls |

## Security Considerations

- Only authorized oracle address can call `settle()` and `expire()`
- Escrow funds never accessible outside settlement logic
- No admin withdrawal function — funds only move via verdict
- Staleness check prevents stale price exploitation
- Immutable calls — no edit/delete after creation
- Integer overflow: use u128 for intermediate multiplication

## Next Steps

- Proceed to [Phase 3 — Supabase Backend](phase-03-supabase-backend.md)
- Contract address needed for Edge Function configuration
