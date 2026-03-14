# SHINSIGHT MVP Architecture — Brainstorm Summary

**Date:** 2026-03-14 | **Status:** Agreed | **PRD Version:** 2.0

---

## Problem Statement

Build a cryptographic alpha marketplace where KOLs commit structured price predictions on-chain, buyers pay to unlock early, and outcomes auto-settle via oracle. Solo dev, new to Move, 4-6 week timeline targeting devnet demo.

## Constraints

- Solo developer
- New to Aptos Move
- 4-6 weeks to working devnet demo
- Partial infra (some accounts provisioned, no code)

---

## Evaluated Approaches

### 1. Oracle Design — Pyth On-Chain vs Custom CoinMarketCap Cron

| Criteria | Pyth On-Chain | Custom CMC Cron | Hybrid |
|----------|--------------|-----------------|--------|
| Trust model | Decentralized | Centralized (you) | Mixed |
| Complexity | Low (Move call) | High (cron+API+tx) | Highest |
| Failure risk | Low (always on-chain) | High (API/cron fails) | Medium |
| Cost | ~0.001 APT/read | API key + compute | Both |
| Narrative strength | Strong | Weak | Medium |

**Decision:** Pyth On-Chain. Eliminates CoinMarketCap dependency entirely. Contract reads Pyth price feed directly. Cron only triggers settlement — doesn't fetch prices.

### 2. Settlement Trigger — pg_cron vs Dedicated Service vs Keeper

| Criteria | pg_cron + Edge Fn | Railway Node.js | Keeper Network |
|----------|-------------------|-----------------|----------------|
| Complexity | Low | Medium | Low |
| Reliability | Medium | High | High |
| Cost | $0 | $5-20/mo | $0.01-0.05/trigger |
| Setup time | ~2 hours | ~4 hours | Unknown (Aptos support?) |

**Decision:** pg_cron + Edge Functions for MVP. Acceptable for devnet. Migrate to dedicated service for mainnet.

### 3. Smart Contract Strategy — Build vs Fork

No off-the-shelf fractional escrow exists. Must build custom Move contract, composing from:
- **Fund holding pattern** from `dhruvja/aptos-escrow`
- **Time-lock pattern** from `move-by-examples/fungible-asset-vesting`
- **Pyth integration** from official Aptos oracle docs

**Decision:** Custom Move contract using existing patterns as reference. Soulbound reputation token deferred to Phase 2.

### 4. Frontend Stack

**Decision:** Next.js App Router + Tailwind CSS + shadcn/ui + @aptos-labs/wallet-adapter-react

---

## Final Recommended Architecture (MVP)

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js App Router)                  │
│  ├─ Tailwind + shadcn/ui (dark Bloomberg theme) │
│  ├─ @aptos-labs/wallet-adapter-react            │
│  ├─ Live Feed / Revealed / Oracles screens      │
│  └─ Seal Call modal (3-step structured form)    │
└─────────────────────────┬───────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Aptos Devnet│  │  Supabase    │  │ Pyth Network     │
│ Smart       │  │  Backend     │  │ (on-chain price) │
│ Contract    │  │              │  └──────────────────┘
│             │  │ ├─ Postgres  │          │
│ ├─ Escrow   │  │ │  (calls,   │          │
│ │  deposit  │  │ │   keys,    │          │
│ │  & split  │  │ │   stats)   │          │
│ │           │  │ │            │          │
│ ├─ Hash     │  │ ├─ Edge Fns  │          │
│ │  commit   │  │ │  (key srv, │          │
│ │           │  │ │   settle   │          │
│ ├─ Settle   │◄─┤ │   trigger) │◄─────────┘
│ │  (reads   │  │ │            │
│ │   Pyth)   │  │ ├─ pg_cron   │
│ │           │  │ │  (30s poll │
│ └─ Events   │  │ │   for due  │
│             │  │ │   reveals) │
└─────────────┘  └──────────────┘
```

### Smart Contract Modules (Move)

```
shinsight/
├── sources/
│   ├── escrow.move          # Deposit, split, refund logic
│   ├── oracle_settlement.move  # Read Pyth, compare, verdict
│   └── call_registry.move   # Hash commit, call metadata
└── Move.toml               # Pyth dependency
```

**No reputation module in MVP** — accuracy stats tracked in Supabase Postgres.

### Settlement Flow (Revised with Pyth)

```
1. KOL submits call → hash written to call_registry
2. Buyer pays → APT deposited to escrow module
3. At revealTimestamp:
   a. pg_cron detects due call → triggers Edge Function
   b. Edge Function calls contract's settle() entry function
   c. settle() reads Pyth price on-chain
   d. settle() compares: closing vs target + direction
   e. settle() executes Fractional Escrow split:
      - TRUE:  90% distributable → KOL (10% protocol fee)
      - FALSE: 27% → KOL, 63% → buyers, 10% → protocol
      - EXPIRED: 0% → KOL, 100% → buyers (if grace exceeded)
   f. Edge Function publishes decryption key
   g. Frontend cards flip open
```

### Key Custody (Supabase)

- Encrypted call blob stored in Postgres (AES-256-GCM)
- Decryption key held in separate table with RLS
- On buyer payment: Edge Function verifies on-chain tx → serves key via signed JWT
- On reveal: Edge Function publishes key publicly (mark row as `revealed=true`)

---

## Scope: MVP (4-6 weeks) vs Deferred

### In Scope (MVP)

- [x] Structured call form (asset, direction, target, timestamp, unlock price)
- [x] Aptos hash commit (call_registry)
- [x] Escrow deposit + Fractional settlement (TRUE/FALSE/EXPIRED)
- [x] Pyth on-chain price oracle for verdict
- [x] Supabase key custody + encrypted blob
- [x] pg_cron + Edge Function settlement trigger
- [x] Buyer unlock flow (pay → verify → serve key)
- [x] Live Feed, Revealed, Oracles screens
- [x] Sealed card UI with black box aesthetic
- [x] Wallet auth (Petra/Martian)
- [x] Accuracy stats in Supabase (win/loss/expired counts)
- [x] Assets: BTC, ETH, SOL, BNB, APT

### Deferred to Phase 2

- [ ] Soulbound reputation token (on-chain)
- [ ] KOL tier system (SEER/PROPHET/ORACLE)
- [ ] Time decay factor in reputation
- [ ] Buyer ratings / SentimentWeight
- [ ] Rationale note (optional text field) — already Phase 2 in PRD
- [ ] Featured KOL placement
- [ ] Subscription tier
- [ ] Dedicated cron service (Railway migration)

---

## Open Questions — Resolved

| # | Question | Resolution |
|---|---------|------------|
| 1 | Price feed source | Pyth Network on-chain (replaces CMC/Binance entirely) |
| 2 | Min reveal gap | 1 hour minimum. Sufficient for MVP |
| 3 | Unlock price floor | 0.1 APT minimum enforced in contract |
| 4 | FALSE refund timing | Immediate on verdict. No dispute window (deterministic judgment) |
| 5 | Cron failure grace | 1 hour. After that → EXPIRED |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Move learning curve exceeds estimate | HIGH | Start with contract first. Fork patterns. 2 weeks budget |
| Pyth price staleness at reveal time | MEDIUM | Add staleness check in Move (reject if >5min stale). Edge Fn can retry |
| pg_cron misses reveal window | MEDIUM | 1-hour grace period covers most failures. Migrate to Railway post-MVP |
| Wallet adapter UX friction | LOW | Use official @aptos-labs/wallet-adapter. Well-documented |
| Supabase Edge Function cold starts | LOW | 30s poll means warm containers most of the time |

---

## Suggested Week-by-Week Plan

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Move contract: escrow + call_registry + Pyth integration | Tested on devnet via CLI |
| 2 | Move contract: settlement logic + Edge Function trigger | End-to-end settlement on devnet |
| 3 | Supabase: schema, key custody, Edge Functions (unlock, reveal) | API layer working |
| 4 | Frontend: Next.js scaffolding, Live Feed, Seal Call flow | Core screens functional |
| 5 | Frontend: Revealed screen, wallet integration, settlement display | Full demo loop |
| 6 | Polish: sealed card animations, testing, bug fixes, devnet demo | Demo-ready |

**Critical path:** Weeks 1-2 (Move contract). If this slips, everything slips.

---

## Success Metrics

- End-to-end flow works on Aptos devnet
- KOL can seal a call → buyer can unlock → settlement auto-executes
- Sealed card UI renders with correct verdict states
- At least 3 test KOLs with multiple calls showing accuracy stats

---

## Next Steps

1. **Create implementation plan** with detailed phase files
2. **Set up project scaffold**: Next.js + Supabase + Move project structure
3. **Start with Move contract** (critical path, highest learning curve)

---

## Research Sources

- [Aptos Oracle Guide](https://aptos.dev/build/guides/oracles)
- [Pyth Network on Aptos](https://www.pyth.network/blog/pyth-launches-price-oracles-on-aptos)
- [move-by-examples](https://github.com/aptos-labs/move-by-examples)
- [dhruvja/aptos-escrow](https://github.com/dhruvja/aptos-escrow)
- [kycDAO SBT module](https://github.com/kycdao/aptos-module)
- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- Researcher reports: `plans/reports/researcher-260313-2323-*`
