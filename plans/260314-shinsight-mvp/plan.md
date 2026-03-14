---
title: "SHINSIGHT MVP Implementation Plan"
description: "Cryptographic alpha marketplace — KOL price predictions with on-chain escrow settlement via Pyth oracle on Aptos devnet"
status: pending
priority: P1
effort: 6w
branch: main
tags: [aptos, move, supabase, nextjs, oracle, escrow, mvp]
created: 2026-03-14
---

# SHINSIGHT MVP — Implementation Plan

## Architecture

```
Frontend (Next.js) --> Aptos Devnet (Move contract) + Supabase (Postgres/Edge/pg_cron) + Pyth (on-chain price)
```

## Phase Overview

| # | Phase | Duration | Status | Dependencies | Key Deliverable |
|---|-------|----------|--------|--------------|-----------------|
| 1 | [Project Setup](phase-01-project-setup.md) | 2d | pending | None | Scaffold, tooling, accounts |
| 2 | [Smart Contract](phase-02-smart-contract.md) | 10d | pending | Phase 1 | Escrow + settlement + registry on devnet |
| 3 | [Supabase Backend](phase-03-supabase-backend.md) | 5d | pending | Phase 2 | Schema, Edge Fns, key custody, pg_cron |
| 4 | [Frontend Core](phase-04-frontend-core.md) | 5d | pending | Phase 3 | Wallet, Live Feed, Seal Call |
| 5 | [Frontend Screens](phase-05-frontend-screens.md) | 5d | pending | Phase 4 | Revealed, Oracles, animations |
| 6 | [Integration & Testing](phase-06-integration-testing.md) | 5d | pending | Phase 5 | E2E devnet demo |

## Critical Path

**Phase 2 (Smart Contract) is the critical path.** Solo dev new to Move — if this slips, everything slips. Budget 2 full weeks. Start here immediately after setup.

## Week Map

| Week | Focus |
|------|-------|
| 1 | Setup + Move contract (escrow, call_registry) |
| 2 | Move contract (Pyth settlement) + devnet deploy |
| 3 | Supabase schema, Edge Functions, key custody |
| 4 | Next.js scaffold, wallet auth, Live Feed, Seal Call |
| 5 | Revealed screen, Oracles screen, card animations |
| 6 | E2E integration, bug fixes, demo polish |

## Locked Decisions

- Oracle: Pyth Network on-chain (NOT CoinMarketCap)
- Settlement trigger: pg_cron + Edge Functions (devnet only)
- Frontend: Next.js App Router + Tailwind + shadcn/ui
- Contract: Custom Move composing from dhruvja/aptos-escrow + move-by-examples + Pyth
- Reputation: DEFERRED to Phase 2. Stats in Supabase Postgres only
- Wallet: Petra/Martian via @aptos-labs/wallet-adapter-react

## Scope Cuts (MVP)

- No soulbound reputation token
- No KOL tier system
- No buyer ratings
- No rationale note field
- No time decay in reputation
- No dedicated cron service (pg_cron sufficient for devnet)

## Success Criteria

- [ ] E2E flow on Aptos devnet: seal -> unlock -> settle
- [ ] Pyth oracle reads price and auto-judges TRUE/FALSE/EXPIRED
- [ ] Fractional Escrow splits funds correctly
- [ ] Sealed card UI with verdict states
- [ ] 3+ test KOLs with accuracy stats

## Research Sources

- [Brainstorm Report](../reports/brainstorm-260314-2326-shinsight-mvp-architecture.md)
- [Oracle Research](../reports/researcher-260313-2323-oracle-architecture-patterns.md)
- [Aptos Ecosystem Research](../reports/researcher-260313-2323-aptos-ecosystem-template-research.md)
- [PRD v2.0](../../PRD_SHINSIGHT.md)
