# SHINSIGHT — Product Overview & Requirements

## Executive Summary

**SHINSIGHT** is a cryptographic alpha marketplace where crypto KOLs commit structured price predictions to the blockchain before market events occur, then auto-reveal at a set timestamp. Buyers pay a micro-fee to unlock early access to sealed call predictions. Settlement is fully automated via on-chain oracle price feeds. KOL reputation is non-transferable and built call by call.

**Tagline:** _Encode first. Prove later. Truth on-chain._

## Product Definition

| Aspect | Detail |
|--------|--------|
| **Type** | Cryptographic marketplace + reputation protocol |
| **Network** | Aptos testnet + Pyth Network oracle |
| **Backend** | Supabase (Edge Functions + Postgres + RLS) |
| **Frontend** | Next.js 16 App Router + Tailwind CSS |
| **Status** | MVP complete (Mar 2026) |
| **Version** | 1.0 |

## Target Users

**KOLs (Key Opinion Leaders)**
- Crypto researchers with strong track records
- Seeking monetization tied to verified accuracy
- Want to build tamper-proof reputation on-chain

**Followers / Buyers**
- Retail traders seeking alpha from trusted voices
- Want verifiable proof of prediction timing
- Willing to pay micro-fees ($0.50–$2 equivalent) for early access

**Ecosystem Stakeholders**
- Information markets seeking calibrated pricing signals
- DeFi protocols wanting to surface legitimate alpha sources

## Core Value Proposition

1. **Cryptographic Proof of Commitment** — Call hash written on-chain before reveal; no retroactive edits
2. **Tamper-Proof Reputation** — KOL track record built from immutable settlement records
3. **Transparent Pricing** — Oracle-verified outcomes, no admin interpretation
4. **Zero Admin Bias** — Pyth Network price feeds + automated settlement eliminate operator discretion

## Key Features (MVP)

| Feature | Status |
|---------|--------|
| Wallet connection (Aptos) | Complete |
| Call submission form (structured data) | Complete |
| Live feed with sealed card visualization | Complete |
| Unlock key system + micro-payments | Complete |
| Call reveal countdown | Complete |
| Oracle settlement (Pyth feeds) | Complete |
| KOL leaderboard by accuracy | Complete |
| Call archive with verdict history | Complete |

## Success Metrics

- **Adoption:** 10+ active KOLs submitting calls weekly
- **Engagement:** 100+ unique buyers per week
- **Accuracy:** Mean KOL track record > 50% (better than coin flip)
- **Settlement Time:** < 2 min from reveal timestamp to settlement complete
- **Uptime:** > 99.9% on Aptos + Supabase edge functions

## Non-Functional Requirements

- **Security:** AES-256-GCM encryption for sealed call data at rest; RLS on all DB tables
- **Performance:** Call card render < 500ms; unlock response < 1s
- **Scalability:** Support 1,000+ concurrent users; 10,000+ calls in circulation
- **Compliance:** No KYC required (testnet phase); ready for mainnet compliance review

## Constraints & Scope (Phase 1)

- **Assets Supported:** BTC, ETH, SOL, BNB, APT only
- **Call Duration:** 1 hour to 30 days (reveal timestamp range)
- **Unlock Price:** 0.1 APT minimum
- **Network:** Aptos testnet only (mainnet planned Phase 2)
- **Rationale Notes:** Optional; up to 1,000 chars; encrypted with call data

## Related Documents

- `system-architecture.md` — 3-layer tech stack design
- `code-standards.md` — Naming, patterns, file organization
- `codebase-summary.md` — Module structure and dependencies
- `deployment-guide.md` — Setup and deployment procedures
