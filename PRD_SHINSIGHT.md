# SHINSIGHT — Product Requirements Document

> **Revision:** 2.0 · March 2026
> **Status:** Pre-development / Planning
> **Product:** Shelby Protocol — SHINSIGHT Oracle & Marketplace
> **Scope:** KOL Alpha Call vertical only
> **Changelog from v1.0:** Three critical logical flaws patched — Decryption Paradox, Oracle Dilemma, Zero-Sum Game Theory

---

## 1. Product Overview

**Product Name:** SHINSIGHT
**Tagline:** *Encode first. Prove later. Truth on-chain.*
**Network:** Aptos Mainnet + Shelby Protocol (decentralized hot storage)
**Backend:** Supabase (key custody, cron oracle, transaction verification)
**Type:** Cryptographic alpha marketplace — KOL price calls, verified automatically

SHINSIGHT is a marketplace where crypto KOLs commit structured price predictions to the blockchain before events occur, then auto-reveal at a set timestamp. Buyers pay a micro-fee to unlock early access. Outcomes are judged automatically by a backend cron job fetching real market prices — no admin, no AI parsing, no ambiguity. A KOL's career is their non-transferable reputation score, built call by call and impossible to fake.

The unforgettable element: sealed calls render as black box cards that visually crack open at reveal time. The hatching texture fades. The verdict bleeds in.

---

## 2. The Problem

**For followers:**
- KOL "alpha" is unverifiable — anyone can claim they called a move after it happened
- No way to distinguish genuine conviction from narrative-building
- Paying for alpha groups with zero accountability or proof of track record

**For legitimate KOLs:**
- Reputation is built on screenshots and word-of-mouth, both forgeable
- No protocol-level proof that a call predated the market move
- No monetization layer tied directly to verified accuracy

**For the ecosystem:**
- Information markets are noise — no mechanism to surface genuinely calibrated voices
- No cryptographic standard for "I knew this before you did"

---

## 3. Core Mechanic: Two-Layer Trust

**Layer 1 — Supabase backend (key custody + encrypted content)**
The KOL's structured call and optional rationale note are encrypted and stored in Supabase. Supabase holds both the encrypted blob and the decryption key. When a buyer pays on-chain, Supabase verifies the transaction and serves the decryption key privately to that buyer via a signed API response. At `revealTimestamp`, a cron job publishes the key publicly — all sealed cards flip open simultaneously.

**Layer 2 — Aptos smart contract (proof of existence + escrow)**
At submission time, a hash of the plaintext call is written to an Aptos smart contract alongside the `revealTimestamp` and the unlock price. The contract holds all buyer escrow funds. It does not hold the decryption key. When the cron oracle submits the TRUE/FALSE verdict at reveal time, the contract executes settlement automatically based on the Fractional Escrow model.

**Why this split works:** The Aptos hash provides tamper-proof timestamped commitment (Layer 2 integrity). Supabase provides practical, scalable key management without requiring on-chain cryptography primitives that Aptos Move does not yet support cleanly in an MVP context. The two layers are independent — neither can be gamed without breaking the other.

---

## 4. Structured Call Format (Fix #2 — Oracle Dilemma)

> All previous mentions of AI/NLP parsing or Manual Admin Oracle are removed. All calls must use the structured input form below.

KOLs submit calls using a fixed schema. Free-text predictions are not accepted as primary call data.

### Required fields

| Field | Type | Options / Constraints |
|---|---|---|
| Asset | Select | BTC, ETH, SOL, BNB, APT (Phase 1) |
| Direction | Select | UP / DOWN |
| Target Price | Number | USD, minimum 1 decimal place |
| Reveal Timestamp | DateTime | Min: +1 hour · Max: +30 days from now |
| Unlock Price | Number | APT, minimum 0.1 APT |

### Optional field

| Field | Type | Notes |
|---|---|---|
| Rationale Note | Text | Encrypted at rest; served with decryption key on unlock. Max 1,000 chars. |

### Example sealed call (public view before purchase)

```
Asset:     ETH
Direction: UP
Target:    [SEALED]
Reveal:    48h 22m remaining
Unlock:    0.5 APT
Buyers:    214  |  Escrow: 107.0 APT
Commit:    AptBlock #8,341,027
```

The Target Price is sealed — buyers cannot see it until they pay or until public reveal. Direction (UP/DOWN) is visible as a teaser to drive purchase intent.

---

## 5. Three-Stage Call Lifecycle

**Stage 1 — Commitment**
- KOL fills structured form: asset, direction, target price, reveal timestamp, unlock price, optional rationale
- Backend hashes the plaintext call data
- Hash + `revealTimestamp` + `unlockPrice` written to Aptos smart contract
- Encrypted call stored in Supabase; decryption key held by Supabase
- Card appears in Live Feed as a sealed black box

**Stage 2 — Alpha Trade**
- Card displays: asset, direction teaser, commit block, countdown, buyer count, escrow total
- Buyer pays `unlockPrice` on-chain → Supabase verifies the transaction → serves decryption key privately to buyer
- Buyer reads full call (target price + rationale note)
- KOL cannot modify or delete the call after submission

**Stage 3 — Proof of Truth**
- At `revealTimestamp`, Supabase cron job:
  1. Fetches real-time closing price for the asset via CoinMarketCap or Binance API
  2. Compares closing price to KOL's target price using the direction condition
  3. Publishes the decryption key publicly — all cards flip open
  4. Submits TRUE or FALSE verdict to the Aptos smart contract
- Smart contract executes Fractional Escrow settlement (see Section 6)
- Reputation token updated on-chain

**Judgment logic:**
```
IF direction == UP  AND closing_price >= target_price → TRUE
IF direction == UP  AND closing_price <  target_price → FALSE
IF direction == DOWN AND closing_price <= target_price → TRUE
IF direction == DOWN AND closing_price >  target_price → FALSE
IF cron fails to publish before revealTimestamp + 1h grace → EXPIRED
```

---

## 6. Fractional Escrow Settlement Model (Fix #3 — Zero-Sum Game Theory)

> The previous 100% refund on FALSE calls is removed. It created a zero-sum dynamic where KOLs had no incentive to post uncertain calls. The Fractional Escrow model preserves KOL participation incentives while maintaining buyer protection.

### Settlement formula

**Step 1:** Deduct 10% protocol fee from total escrow before any split.

```
total_escrow = unlockPrice × buyerCount
protocol_fee = total_escrow × 0.10
distributable = total_escrow × 0.90
```

**Step 2:** Split `distributable` based on verdict.

| Verdict | KOL receives | Buyer receives | Reputation |
|---|---|---|---|
| TRUE | 100% of distributable | 0% (paid for valid alpha) | Heavy increase |
| FALSE | 30% of distributable | 70% refund per buyer | Decrease |
| EXPIRED | 0% | 100% full refund per buyer | Massive slash (Silence Penalty) |

### Rationale

- **TRUE:** KOL earned it. Full payout. Strong reputation gain reinforces posting high-conviction calls.
- **FALSE:** KOL still receives 30% — compensates for insight provided and time invested. Reduces the penalty enough that KOLs will post uncertain but genuine calls rather than only posting "sure things". Buyer receives 70% back — meaningful insurance, not a windfall.
- **EXPIRED:** Zero tolerance for silence. KOL gets nothing. Buyers made whole. Reputation takes the heaviest possible hit. This rule is the protocol's core integrity guarantee — silence is the worst possible outcome.

### Example settlement (FALSE call, 200 buyers at 0.5 APT each)

```
total_escrow    = 100.0 APT
protocol_fee    = 10.0 APT  (10%)
distributable   = 90.0 APT

KOL receives    = 27.0 APT  (30% of 90)
Buyers receive  = 63.0 APT total  (70% of 90 ÷ 200 buyers = 0.315 APT each)
```

---

## 7. Mandatory Revelation Rule

EXPIRED is not a neutral outcome. The protocol treats silence as the worst violation of buyer trust.

- At `revealTimestamp + 1 hour grace period`, if the cron job cannot determine a verdict (API failure, corrupted data), the call is classified as EXPIRED
- EXPIRED = 0% to KOL + 100% buyer refund + maximum reputation slash
- This prevents KOLs from making 10 calls, hoping 8 expire quietly, and claiming the 2 that were right

---

## 8. Reputation Score

Non-transferable. Stored on Aptos as a soulbound token. New wallet = zero score. Cannot be purchased, transferred, or reset.

```
Score = (TrueCalls × AccuracyWeight)
      − (FalseCalls × PenaltyWeight)
      − (ExpiredCalls × SilencePenalty)
      + (BuyerRating × SentimentWeight)
      × TimeDecayFactor
```

**Parameters (Phase 1 defaults):**

| Parameter | Value | Rationale |
|---|---|---|
| AccuracyWeight | 1.0 | Base unit |
| PenaltyWeight | 1.5 | FALSE costs more than TRUE earns (asymmetric) |
| SilencePenalty | 3.0 | EXPIRED is a protocol betrayal — harshest penalty |
| SentimentWeight | 0.3 | Buyer ratings advisory, not primary |
| TimeDecayFactor | 0.95 per 90 days | Prevents coasting on old calls |

---

## 9. KOL Tier System

| Tier | Badge | Unlock Criteria | Perks |
|---|---|---|---|
| SEER | Silver | Any active KOL | Listed in directory |
| PROPHET | Gold | >65% accuracy + 50+ calls | Featured in feed, reduced protocol fee (8%) |
| ORACLE | Amber/animated | >85% accuracy + 100+ calls | Top placement, verified checkmark, 5% fee |

Tiers recalculate every 7 days. Downgrade is possible — tier is a live state, not an achievement.

---

## 10. Buyer Experience

**Before purchase:**
- Asset and direction visible (UP/DOWN teaser)
- Target price sealed
- Commit block number always visible (tamper-proof proof of prior knowledge)
- Countdown timer (live)
- Buyer count + escrow amount (social proof)
- KOL tier badge + accuracy ring

**After unlock payment:**
- Full call revealed: target price + optional rationale note
- Supabase verifies on-chain payment, serves decryption key via signed API response
- If call resolves FALSE → 70% partial refund automatically triggered
- If call resolves EXPIRED → 100% refund automatically triggered

**After public reveal:**
- All sealed cards flip simultaneously (cron publishes key)
- Verdict stripe: green (TRUE) / red (FALSE) / gray (EXPIRED)
- Final settlement displayed per buyer
- KOL reputation delta shown on card

---

## 11. Technical Architecture

```
[KOL client]
    |── fills structured form (asset, direction, target, timestamp, price)
    |── hash(call_data) → Aptos smart contract (proof of existence)
    |── smart contract stores: contentHash, revealTimestamp, unlockPrice
    |── Supabase stores: encrypted call blob + decryption key
    ▼
[Buyer pays unlockPrice on-chain]
    |── Supabase verifies tx via Aptos RPC
    |── Supabase serves decryption key privately to buyer (signed JWT)
    |── buyer decrypts: reads target price + rationale note
    ▼
[At revealTimestamp — Supabase cron job]
    |── fetches closing price: CoinMarketCap API or Binance API
    |── evaluates: closing vs target, direction condition
    |── publishes decryption key publicly → all cards reveal
    |── submits verdict (TRUE / FALSE / EXPIRED) to Aptos smart contract
    ▼
[Aptos smart contract — settlement]
    |── deducts 10% protocol fee
    |── TRUE: 100% distributable → KOL wallet
    |── FALSE: 30% distributable → KOL wallet, 70% → buyer refunds
    |── EXPIRED: 0% → KOL, 100% → buyer refunds
    |── updates soulbound reputation token on-chain
```

### Key infrastructure components

| Component | Technology | Role |
|---|---|---|
| Smart contract | Aptos Move | Escrow, content hash, verdict settlement, reputation token |
| Key custody | Supabase (Postgres + Edge Functions) | Encrypted blob storage, decryption key management |
| Cron oracle | Supabase cron (pg_cron) | Fetch price at reveal, compute verdict, trigger settlement |
| Price feed | CoinMarketCap API + Binance API (fallback) | Source of truth for verdict |
| Frontend | Next.js (App Router) | Live Feed, Revealed, Oracles screens |
| Auth | Aptos wallet (Petra/Martian) | Wallet-based identity, no email/password |

---

## 12. UI/UX Direction

**Aesthetic:** Bloomberg Terminal meets intelligence briefing room.
**Background:** Near-black `#0C0B09`
**Accent:** Amber/gold `#EF9F27` — insider, premium, truth
**Typography:** Playfair Display (serif) for headlines; Courier New (mono) for all data, blocks, prices
**Sealed card texture:** Diagonal hatching fades on hover — the black box is cracking open
**Verdict states:** Green stripe `#1D9E75` (TRUE) · Red stripe `#E24B4A` (FALSE) · Gray `#888780` (EXPIRED)

**Three primary screens:**

1. **Live Feed** — sealed call marketplace. Cards show asset, direction teaser, countdown, escrow, KOL tier. Hover activates golden glow and unlock button.
2. **Revealed** — post-reveal archive. Verdict stripe at top. Full call data. Settlement breakdown. Reputation delta. Permanent commit block proof.
3. **Oracles** — KOL leaderboard. Accuracy ring (animated arc). Tier badge. Streak counter. Total calls / true calls / followers.

**Seal Call flow (KOL-side):** 3-step modal — structured form → preview what buyers see (target sealed) → commit to chain with block number confirmation.

---

## 13. Phase Roadmap

### Phase 1 — MVP (Months 1–2)
- Structured call submission (asset, direction, target price, timestamp)
- Aptos hash commit + Supabase key custody
- Supabase cron oracle: CoinMarketCap price fetch + auto-verdict
- Fractional Escrow settlement on-chain (10% fee, TRUE/FALSE/EXPIRED splits)
- Live Feed, Revealed, Oracles screens
- Basic reputation score (no time decay yet)
- Supported assets: BTC, ETH, SOL, BNB, APT

### Phase 2 — Depth (Months 3–4)
- Time decay factor activated in reputation score
- Optional rationale note (encrypted, served with key)
- Featured KOL placement marketplace
- Buyer subscription tier (flat-rate access to all ORACLE-tier calls)
- Expand asset list (AVAX, ARB, OP, etc.)

### Phase 3 — Ecosystem (Month 5+)
- API for algorithmic traders / fund managers
- Cross-chain KOL identity (reputation bridges to other chains)
- DAO governance for oracle dispute resolution
- Non-price call types (TVL, protocol launches) — requires manual review panel for Phase 3 only

---

## 14. Open Questions (Phase 1)

1. **Price feed source of truth:** Use CoinMarketCap as primary with Binance API as fallback, or run both and take median? Median is more robust but adds latency to cron execution.
2. **Minimum `revealTimestamp` gap:** 1-hour minimum sufficient, or should there be a 6-hour floor to prevent near-term gaming on thin liquidity assets?
3. **Unlock price floor:** Protocol-enforced minimum of 0.1 APT to prevent spam calls with zero economic stake?
4. **FALSE partial refund timing:** 70% buyer refund executes immediately on verdict, or is there a 24-hour dispute window before settlement is final?
5. **Cron failure handling:** If both CoinMarketCap and Binance APIs are unreachable at `revealTimestamp`, how long is the grace period before EXPIRED is triggered? Proposed: 1 hour.

---

## 15. Resolved Design Decisions

All three critical logical flaws from v1.0 are patched and locked for Phase 1.

| # | Flaw | Resolution |
|---|---|---|
| Fix #1 | **Decryption Paradox** — Smart contract holding decryption key is not technically viable in MVP. | Hybrid model: Aptos contract holds hash + escrow only. Supabase holds encrypted blob + key. Supabase verifies on-chain payment and serves key via signed API. Cron publishes key at reveal. |
| Fix #2 | **Oracle Dilemma** — NLP/AI parsing of free-text calls is unreliable. Manual admin oracle is not scalable and introduces centralization risk. | Structured input form only (asset, direction, target price). Supabase cron fetches real market price at reveal and computes verdict automatically. No human in the loop. |
| Fix #3 | **Zero-Sum Game Theory** — 100% buyer refund on FALSE kills KOL incentive to post uncertain-but-genuine calls, resulting in only "sure thing" posts or low call volume. | Fractional Escrow: 10% protocol fee first. TRUE = KOL gets 100% of remainder. FALSE = KOL 30%, buyer 70%. EXPIRED = KOL 0%, buyer 100%. Asymmetric penalties reward truth-telling, punish silence hardest. |

---

*Document version: 2.0 · March 2026*
*Project: SHINSIGHT — Shelby Protocol*
*Status: Pre-development / Planning — Phase 1 design decisions locked, ready for /brainstorm*
