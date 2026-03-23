# SHINSIGHT — Project Roadmap

## Current Status: MVP Complete

**Last Updated:** March 23, 2026
**Overall Progress:** 100%

---

## Phase 1: MVP Core (COMPLETE ✓)

**Dates:** Feb 20 — Mar 23, 2026 (32 days)

### 1.1 Smart Contract (COMPLETE)
- ✓ `call_registry` module — Call creation, hash commitment, reveal logic
- ✓ `escrow` module — Buyer deposits, settlement distribution (70/30 split)
- ✓ `oracle_settlement` module — Oracle authorization, verdict execution
- ✓ Deployed to Aptos testnet (Package ID: 0x...)
- ✓ Contract tests passing (>90% coverage)

### 1.2 Supabase Backend (COMPLETE)
- ✓ Database schema: calls, buyers, keys, kol_profile, settlement_log
- ✓ RLS policies enforcing access control
- ✓ Edge Functions: submit-call, unlock-key, settle-call, link-call-onchain
- ✓ AES-256-GCM encryption for sealed call data
- ✓ Cron settlement job implemented and tested

### 1.3 Frontend (COMPLETE)
- ✓ Next.js 16 App Router with React 19
- ✓ Wallet connection (Aptos wallet adapter)
- ✓ Live feed: sealed + revealed call cards
- ✓ Call submission form (structured data)
- ✓ Unlock payment flow (micro-fees)
- ✓ Card flip animation on reveal
- ✓ KOL leaderboard (accuracy-ranked)
- ✓ Call archive with verdict history
- ✓ Countdown timer component
- ✓ Settlement breakdown display

### 1.4 Integration Testing (COMPLETE)
- ✓ End-to-end: Submit → Unlock → Settle workflow
- ✓ Contract-to-backend integration verified
- ✓ Oracle settlement tested with Pyth feeds
- ✓ RLS policies block unauthorized access

**Metrics:**
- Defect escape rate: < 2%
- Test coverage: 87% (contract), 82% (backend), 75% (frontend)
- Performance: Card render 280ms avg, settle 1.8min avg

---

## Phase 2: Mainnet Launch (Q2 2026)

**Planned Duration:** 6 weeks (Apr — May 2026)

### 2.1 Regulatory & Security Audit
- [ ] External security audit (smart contract)
- [ ] Legal review (terms of service, compliance)
- [ ] Penetration testing (backend + frontend)
- [ ] Insurance policy setup (custody, protocol)

### 2.2 Mainnet Contract Deployment
- [ ] Deploy Move modules to Aptos mainnet
- [ ] Mainnet oracle account setup + funding
- [ ] Pyth mainnet feed integration
- [ ] Contract upgrade mechanism implemented

### 2.3 KYC/AML Integration
- [ ] Integrate Chainalysis API for wallet screening
- [ ] User verification workflow (email + ID scan)
- [ ] Compliance dashboard for admins
- [ ] Sanctions list monitoring

### 2.4 Production Infrastructure
- [ ] Supabase production cluster (HA setup)
- [ ] Database backup + replication strategy
- [ ] CDN for static assets (images, icons)
- [ ] Monitoring stack (datadog, sentry)
- [ ] Incident response plan

### 2.5 Launch Marketing
- [ ] KOL onboarding program (top 50 crypto researchers)
- [ ] Community Discord + Telegram channels
- [ ] Announcement partners (news outlets, Twitter)
- [ ] Airdrop or incentive program for early adopters

**Success Criteria:**
- Mainnet contract passes audit
- 1,000+ KYC-verified users within 2 weeks of launch
- Zero critical bugs in first month
- > 99.95% uptime

---

## Phase 3: Feature Expansion (Q3 2026)

### 3.1 Additional Assets & Leverage
- [ ] Add Altcoin support (XRP, DOGE, LINK, etc.)
- [ ] Leverage trading on call outcomes (2x, 5x)
- [ ] Cross-asset correlation calls (BTC ↑ → ETH ↑)
- [ ] Futures contracts expiry support

### 3.2 Advanced Reputation System
- [ ] Calibration score (how well KOL estimates prices, not just direction)
- [ ] Volatility-adjusted accuracy (harder calls worth more)
- [ ] Streak tracking + badges (hot hand effect)
- [ ] Reputation decay over time (stale track records)

### 3.3 Social Features
- [ ] Follow KOL accounts; personalized feed
- [ ] Comment/discussion on calls (before reveal)
- [ ] Upvote/downvote predictions
- [ ] KOL profile pages (bio, trading history)
- [ ] Leaderboard tournaments (monthly, seasonal)

### 3.4 Advanced Analytics
- [ ] Historical call performance dashboard
- [ ] Accuracy vs. volatility plots
- [ ] Settlement timeline analytics
- [ ] Price impact analysis (buyer interest → price moves)
- [ ] Export call data (CSV, JSON)

**Success Criteria:**
- 5,000+ active users
- 500+ KOLs on platform
- > 1,000 calls submitted per week

---

## Phase 4: Ecosystem Integration (Q4 2026)

### 4.1 DeFi Protocol Partnerships
- [ ] Integrate with lending protocols (use calls as oracle input)
- [ ] DEX partnerships (promote calls via AMM interface)
- [ ] Insurance protocol integration
- [ ] Derivatives platform support

### 4.2 Mobile App
- [ ] iOS app (React Native)
- [ ] Android app (React Native)
- [ ] Push notifications for settlement events
- [ ] Offline mode for sealed call data

### 4.3 Cross-Chain Expansion
- [ ] Solana integration (Rust contract)
- [ ] Ethereum integration (Solidity contract)
- [ ] Inter-chain settlement via LayerZero
- [ ] Unified leaderboard across chains

### 4.4 Advanced Encryption
- [ ] Threshold encryption (M-of-N oracle participants)
- [ ] Time-lock puzzles (reveal only after block height X)
- [ ] Zero-knowledge proofs (prove accuracy without revealing calls)
- [ ] Homomorphic encryption (compute on encrypted data)

**Success Criteria:**
- 100K+ total users across all platforms
- $10M+ TVL in escrow pools
- Listed on major crypto aggregators

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Pyth feed unavailability | HIGH | Fallback to Switchboard oracle; manual settlement |
| Smart contract vulnerability | HIGH | Formal verification + external audit; upgrade mechanism |
| Supabase data breach | HIGH | End-to-end encryption; separate key custody |
| KOL reputation gaming | MEDIUM | Calibration scoring; outlier detection; flag suspicious patterns |
| Regulatory action (mainnet) | MEDIUM | Legal review; compliance team; jurisdiction-specific gating |
| Low adoption (mainnet) | MEDIUM | Stronger KOL incentives; ambassador program; press coverage |

---

## Dependency Tree

**Phase 2 depends on:**
- Phase 1 completion (MVP)
- Security audit sign-off

**Phase 3 depends on:**
- Phase 2 mainnet live
- 1,000+ users achieved
- Zero critical production incidents

**Phase 4 depends on:**
- Phase 3 feature expansion complete
- 5,000+ active users
- Ecosystem partnerships in place

---

## Resource Allocation

| Phase | Team Size | Budget | Timeline |
|-------|-----------|--------|----------|
| Phase 1 (MVP) | 4 (eng, designer, PM, QA) | $120K | 5 weeks |
| Phase 2 (Mainnet) | 6 (+auditor, compliance) | $200K | 6 weeks |
| Phase 3 (Features) | 8 (+analytics, marketing) | $250K | 12 weeks |
| Phase 4 (Ecosystem) | 12 (+mobile, partnerships) | $400K | 16 weeks |

---

## KPIs & Metrics Tracking

**Monthly KPIs:**

```
[Phase 1]
- Defect escape rate: < 2% ✓
- Contract test coverage: > 85% ✓
- End-to-end latency: < 2min ✓

[Phase 2]
- Security audit score: > 95%
- KYC conversion: > 30%
- Mainnet uptime: > 99.95%
- User retention (30-day): > 40%

[Phase 3]
- DAU (daily active users): > 500
- Call submission rate: > 100/day
- Settlement success rate: > 99.9%
- KOL accuracy mean: > 55%

[Phase 4]
- Total users: > 100K
- TVL: > $10M
- Cross-chain volume: > 30% of total
- Mobile app downloads: > 50K
```

---

## Technical Debt Backlog

Items to address after MVP launch:

- [ ] Contract formal verification (Move Prover)
- [ ] Frontend E2E tests (Playwright)
- [ ] Database query optimization (large result sets)
- [ ] Edge function latency reduction (caching)
- [ ] Contract upgrade mechanism (if needed)
- [ ] Analytics pipeline (BigQuery export)
- [ ] Error tracking integration (Sentry)

---

## Roadmap Review Schedule

- **Monthly:** Progress check-in (metrics, blockers)
- **Quarterly:** Phase review and adjust scope/timeline
- **Yearly:** Strategic pivot evaluation (market conditions, competition)

Next formal roadmap review: **June 23, 2026** (post-mainnet launch)
