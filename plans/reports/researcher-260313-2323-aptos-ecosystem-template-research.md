# Research Report: Aptos Move Ecosystem for Escrow & Prediction Market

**Date:** March 13, 2026
**Prepared for:** SHINSIGHT Protocol Implementation
**Focus:** Reusable templates, modules, and patterns for escrow settlement & reputation tokens

---

## Executive Summary

The Aptos Move ecosystem has **limited mature escrow/settlement templates** but **strong foundational patterns**. Two functional escrow repos exist (both dated 2022, unmaintained) suitable only as learning references. For **prediction market + reputation token systems**, the ecosystem offers:

1. **Soulbound token native support** (kycDAO implementation available)
2. **Oracle integration patterns** (Pyth + Chainlink ready)
3. **Fungible Asset migration** (major 2025 change: coins → FA standard)
4. **Modern Move examples** (vesting, voting, dutch auction patterns)

**Key finding:** No off-the-shelf settlement contract exists. Building custom is necessary. Official Aptos examples + oracle docs provide a solid foundation.

---

## 1. Escrow Contracts (Existing Implementations)

### 1.1 dhruvja/aptos-escrow

**Repo:** [github.com/dhruvja/aptos-escrow](https://github.com/dhruvja/aptos-escrow)

| Aspect | Details |
|--------|---------|
| **Purpose** | Token swap escrow: one party deposits, other party transfers, both get coins |
| **Status** | Dormant (4 commits, last Aug 2022) |
| **Maintainability** | Not actively maintained |
| **Architecture** | Three-phase: Initialize → Cancel (abort) → Exchange (settle) |
| **Adaptability** | **Low** — only handles 1:1 swaps, no conditional release logic |
| **Value** | **Reference implementation only** — shows basic escrow structure |

**Code Pattern:**
```move
// Initialize: Person A deposits
public entry fun initialize(account: &signer, amount: u64, token: Coin<TokenA>)

// Cancel: Abort, return tokens
public entry fun cancel(account: &signer)

// Exchange: Complete swap
public entry fun exchange(account: &signer, other_address: address)
```

**Limitations for SHINSIGHT:**
- ✗ No conditional payouts (only atomic swap)
- ✗ No fractional settlement
- ✗ No oracle/timestamp integration
- ✓ Can borrow initialization/storage patterns

---

### 1.2 wb-ts/aptos-escrow-contract

**Repo:** [github.com/wb-ts/aptos-escrow-contract](https://github.com/wb-ts/aptos-escrow-contract)

| Aspect | Details |
|--------|---------|
| **Purpose** | Token swap escrow variant |
| **Status** | Dormant (1 commit, Oct 2022) |
| **Code Quality** | Minimal example |
| **Same as dhruvja/aptos-escrow** | Essentially a fork/duplicate |

**Verdict:** Skip. Use dhruvja version as reference if needed.

---

## 2. Soulbound Tokens / Reputation (Non-Transferable)

### 2.1 kycdao/aptos-module

**Repo:** [github.com/kycdao/aptos-module](https://github.com/kycdao/aptos-module)

| Aspect | Details |
|--------|---------|
| **Purpose** | Soulbound tokens (SBTs) for identity/credentials |
| **Status** | Active, production-ready |
| **Maintainability** | Actively maintained by kycDAO team |
| **Standard** | Uses Aptos Token v2 (Object model) |
| **Core Functions** | `mint_with_signature()`, `verify_proof_of_knowledge()` |

**Key Features:**
- ✓ Non-transferable by design
- ✓ Tier support (multiple credential levels)
- ✓ Expiration dates built-in
- ✓ Signature verification for authorized mints
- ✓ Resource account pattern for isolation

**Suitability for KOL Reputation:**
- ✓ **Excellent** — directly applicable to reputation scoring
- ✓ Can encode tier (bronze/silver/gold accuracy levels)
- ✓ Temporal validity (season-based reputation resets)
- ✓ Proof-of-knowledge pattern ensures authenticity

**Adaptation Path:**
```move
// Extend with performance metrics
public fun mint_reputation(
    kol: &signer,
    tier: u8,           // accuracy level
    win_rate: u64,      // percentage
    call_count: u64,    // number of calls made
    season: u64         // season identifier
)
```

**Resource:** [Aptos Soulbound Token Guide](https://www.ankr.com/docs/smart-contract-tutorials/non-rentable-soulbound-nft/) provides implementation details.

---

## 3. Aptos Coin Handling & Escrow Patterns

### 3.1 Coin v1 vs. Fungible Asset (FA) Standard

**CRITICAL:** June-July 2025 migration from Coin v1 to Fungible Asset standard.

| Feature | Coin v1 (Legacy) | Fungible Asset (New) |
|---------|------------------|----------------------|
| **Status as of 2026** | Deprecated; migration complete June 30, 2025 |
| **APT Migration** | June 30 - July 8, 2025 |
| **Other coins** | June 23-30, 2025 |
| **Compatibility** | Coin module still works; auto-paired FA created |
| **New Features** | N/A | Custom withdraw/deposit logic, taxes, compliance |

**For SHINSIGHT escrow deposits:**
- Use Fungible Asset standard going forward
- Coin module functions still auto-convert; safe to use but legacy
- Consider FA if custom fee/tax logic needed for splits

**Deposit/Withdraw Pattern (Coin v1, still valid):**
```move
// Withdraw from user
let coins = coin::withdraw<APT>(user, amount);

// Deposit to contract
coin::deposit(escrow_account, coins);

// Refund
let refund = coin::extract_all(&mut held_coin);
coin::deposit(user_account, refund);
```

**Reference:** [Aptos Coin Documentation](https://aptos.dev/build/smart-contracts/aptos-coin)

---

## 4. Oracle Integration (External Data for Settlement)

### 4.1 Pyth Network Integration

**Status:** Production-ready, ideal for price feeds

**Pattern for Settlement Verdict:**
```move
use pyth::pyth;
use pyth::price_identifier;

public fun verify_price_vs_target(
    pyth_price_update: vector<vector<u8>>,
    target_price: u64,
    direction: bool  // true = UP, false = DOWN
): bool {
    // Pay update fee
    let coins = coin::withdraw(signer, pyth::get_update_fee(&pyth_price_update));
    pyth::update_price_feeds(pyth_price_update, coins);

    // Fetch BTC/USD or other price
    let price_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
    let price = pyth::get_price(price_identifier::from_byte_vec(price_id));

    // Compare
    if (direction) {
        price.value >= target_price
    } else {
        price.value <= target_price
    }
}
```

**Setup (Move.toml):**
```toml
[dependencies]
Pyth = { git = "https://github.com/pyth-network/pyth-crosschain.git",
         subdir = "target_chains/aptos/contracts", rev = "main" }

[addresses]
pyth = "0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387"
```

**Pros:**
- ✓ Real-time price data from major exchanges
- ✓ Audited, battle-tested
- ✓ Handles multiple assets (BTC, ETH, SOL, APT)

**Cons:**
- ✗ Requires price update transaction (gas cost paid by caller)
- ✗ Not decentralized settlement trigger; backend must call

**For SHINSIGHT:** Use Pyth in cron job to fetch prices, pass update vector to settlement tx.

**Reference:** [Aptos Oracle Guide](https://aptos.guide/build/guides/oracles)

### 4.2 Chainlink (Alternative)

- CCIP for cross-chain swaps (not needed for APT-only)
- Data Feeds available; similar pattern to Pyth
- More centralized; less ideal for pure oracle settlement

---

## 5. Modern Move Examples (Pattern Library)

**Repo:** [github.com/aptos-labs/move-by-examples](https://github.com/aptos-labs/move-by-examples)

**Most Relevant to Escrow/Settlement:**

### 5.1 Fungible Asset Vesting
**File:** `fungible-asset-vesting/`
- **Use:** Time-locked fund releases
- **Pattern:** `Escrow` resource with `release_schedule`
- **Applicable:** Scheduled payouts for partial settlement

### 5.2 Dutch Auction
**File:** `dutch-auction/`
- **Use:** Declining price mechanism
- **Pattern:** Time-based state progression
- **Applicable:** If using price curves for settlement (not core SHINSIGHT need)

### 5.3 Fungible Asset with Permission
**File:** `fungible-asset-with-permission/`
- **Use:** Gated transfers
- **Pattern:** Role-based fund release
- **Applicable:** Admin-controlled settlement triggers

### 5.4 Fungible Asset Voting
**File:** `fungible-asset-voting/`
- **Use:** Vote counting + tally
- **Pattern:** Event-driven state updates
- **Applicable:** Could adapt for multi-party settlement votes (not needed for SHINSIGHT oracle model)

**Access:** All examples include unit tests (`sources/*_tests.move`) as learning reference.

---

## 6. Aptos Move Development Tools & Workflow

### 6.1 CLI & Testing

**Primary Tool:** `aptos` CLI

```bash
# Compile
aptos move compile

# Run unit tests
aptos move test

# Run with verbose output
aptos move test --verbose

# Code coverage
aptos move coverage
```

**Test Annotations Available:**
```move
#[test]
#[expected_failure]
#[expected_failure(abort_code = 0x1)]
#[test_only]
```

**Status 2026:** Mutation testing tool added (aptos move mutate) to find gaps in unit test coverage.

**Reference:** [Aptos Testing Docs](https://aptos.dev/build/smart-contracts/book/unit-testing)

### 6.2 IDE Support

- **VS Code Extension:** Official Move on Aptos extension (semantic highlighting, go-to-definition, real-time diagnostics)
- **Cursor:** Full support via Move extension
- **Status 2026:** Actively maintained, updated quarterly

### 6.3 Official Examples & Scaffolding

**create-aptos-dapp CLI:**
```bash
npm create aptos-dapp@latest
```
Scaffolds full-stack dApp (Move + TypeScript frontend).

**Move By Examples:** 16 ready-to-run projects (no setup needed, copy + adapt).

---

## 7. Vibe Hack 2025 (Active Hackathon Project)

**Repo:** [github.com/aptos-labs/vibe-hack-2025](https://github.com/aptos-labs/vibe-hack-2025)

**Status:** Active 2025 hackathon (Aug 4 voting deadline passed; repo still open)

**Smart Contract Features:**
- Upvote/downvote system (one vote per wallet per project)
- Vote switching + removal
- Sybil attack prevention
- Score calculation: UPVOTES - DOWNVOTES

**Relevance to SHINSIGHT:**
- ✓ Shows voting mechanism on-chain (useful pattern reference)
- ✓ Event-driven architecture
- ✗ No escrow or conditional payout logic
- ✗ No oracle integration

**Value:** Study `/move` folder for clean, recent Move 2 code patterns.

---

## 8. Aptos Framework & Official References

### 8.1 Key Modules to Study

| Module | Path | Use Case |
|--------|------|----------|
| coin | aptos-framework/sources/coin.move | Escrow deposits/withdrawals |
| account | aptos-framework/sources/account.move | Account resource patterns |
| timestamp | aptos-framework/sources/timestamp.move | Reveal timing logic |
| event | aptos-framework/sources/event.move | Settlement event logging |

**Where to Find:** [github.com/aptos-labs/aptos-core](https://github.com/aptos-labs/aptos-core/tree/main/aptos-move/framework/aptos-framework/sources)

### 8.2 Documentation Hubs

- **Main Docs:** [aptos.dev](https://aptos.dev)
- **Learn Platform:** [learn.aptoslabs.com](https://learn.aptoslabs.com)
- **Move by Example:** [move-developers-dao.gitbook.io/aptos-move-by-example](https://move-developers-dao.gitbook.io/aptos-move-by-example)

---

## 9. Architectural Patterns to Borrow

### 9.1 From kycDAO (Reputation)
```move
struct SoulboundToken has key {
    id: UID,
    tier: u8,
    expiration_epoch: u64,
    metadata: String,
}

// Non-transferable by design
// Signature verification for mint
// Audit trail via events
```

### 9.2 From Escrow Repos (Fund Holding)
```move
struct EscrowAccount<CoinType> has key {
    account_address: address,
    coins: Coin<CoinType>,
    is_frozen: bool,
}

// Initialize → state machine → settled/cancelled
// Clear ownership semantics
```

### 9.3 From Vesting Examples (Time-Lock Release)
```move
struct ReleaseSchedule has store {
    amount: u64,
    release_time: u64,
    released: bool,
}

// Time-based conditional logic
// State progression
```

### 9.4 From Pyth Integration (Oracle Settlement)
```move
public fun settle_on_price_feed(
    oracle_update: vector<u8>,
    expected_price: u64,
    direction: bool
) {
    // Update price feed
    // Compare actual vs. expected
    // Release funds if matched
}
```

---

## 10. Tech Stack Recommendation for SHINSIGHT

| Layer | Technology | Source |
|-------|-----------|--------|
| **Smart Contract** | Move (latest 2.0 syntax) | Aptos Labs official |
| **Coin Handling** | Fungible Asset (post-June 2025) | Built-in |
| **Reputation Tokens** | Token v2 Objects (soulbound) | kycDAO pattern |
| **Oracle (Price Feeds)** | Pyth Network | Mature production |
| **Escrow Logic** | Custom (dhruvja pattern + vesting) | Compose from examples |
| **Testing** | `aptos move test` + mutation testing | CLI built-in |
| **IDE** | VS Code + Move extension | Official |
| **CLI** | `aptos` CLI (latest) | Aptos Labs |

---

## 11. Gotchas & Limitations

### 11.1 Coin v1 Deprecation
- ✗ Old code examples use `coin::withdraw/deposit`
- ✓ Still works; auto-pairs with FA under hood
- **Action:** No immediate change needed; plan FA migration by 2026 Q4

### 11.2 Escrow Patterns Immature
- ✗ No battle-tested "fractional escrow settlement" template
- ✗ Existing repos unmaintained since 2022
- **Action:** Build custom; test heavily before mainnet

### 11.3 Oracle Settlement Not Atomic
- ✗ Pyth oracle update ≠ settlement trigger (two separate txs)
- ✗ Backend must call both: (1) price update, (2) settlement function
- **Action:** Accept off-chain cron pattern; design idempotency safeguards

### 11.4 Soulbound Tokens Require Signature
- ✗ kycDAO pattern requires pre-signed permission
- ✗ Cannot mint reputation retroactively without KOL's key
- **Action:** Pre-stage signature in backend; include in settlement tx

### 11.5 Move 2.0 Migration
- ✗ Some examples still use Move 1.0 syntax
- ✓ Move 2.0 now standard; better IDE support
- **Action:** Use `aptos move --move-2` flag; ignore v1 examples

---

## 12. Unresolved Questions

1. **Fractional Settlement Formula:** How to split escrow across partial wins/losses? No Move example exists; design custom logic.

2. **KOL Key Custody:** For soulbound minting, does KOL sign every reputation grant, or does backend hold delegated key? Affects flow.

3. **Escrow Collision:** If two calls settle simultaneously on same contract, race condition risk? Move's linearity prevents double-spend, but need to confirm state isolation.

4. **Fungible Asset Custom Logic:** Should SHINSIGHT use FA with custom deposit/withdraw hooks (e.g., settlement tax), or stick with standard FA + Coin wrapper?

5. **Settlement Idempotency:** If settlement oracle call fails mid-tx, can it be retried safely? Need abort patterns.

6. **Cross-Asset Payouts:** If call is APT but buyer wants USDC refund, need swap logic (not covered by examples).

---

## Summary Table

| Need | Best Option | Status | Confidence |
|------|------------|--------|------------|
| **Escrow deposit/withdraw** | dhruvja pattern + coin module | Reference | **High** |
| **Reputation tokens** | kycDAO soulbound | Production | **High** |
| **Price feed oracle** | Pyth Network | Production | **High** |
| **Settlement logic** | Custom (compose from examples) | DIY | **Medium** |
| **Vesting/time-lock** | move-by-examples FA vesting | Reference | **High** |
| **Testing** | aptos move test + mutation | Built-in | **High** |

---

## Next Steps

1. **Fork & Study:** Clone [kycdao/aptos-module](https://github.com/kycdao/aptos-module) and [dhruvja/aptos-escrow](https://github.com/dhruvja/aptos-escrow); adapt patterns.

2. **Build Custom Settlement:** Start with escrow + vesting + oracle patterns; design fractional payout logic.

3. **Prototype Reputation:** Extend kycDAO SBT with KOL performance metrics (win rate, call count, tier).

4. **Test on Testnet:** Deploy to Aptos testnet; run full settlement simulation with Pyth mock data.

5. **Plan FA Migration:** If using coins, prepare for legacy Coin → FA migration (Jan 2026 deadline).

---

**Sources:**

- [kycdao/aptos-module](https://github.com/kycdao/aptos-module)
- [dhruvja/aptos-escrow](https://github.com/dhruvja/aptos-escrow)
- [aptos-labs/move-by-examples](https://github.com/aptos-labs/move-by-examples)
- [aptos-labs/vibe-hack-2025](https://github.com/aptos-labs/vibe-hack-2025)
- [Aptos Coin Documentation](https://aptos.dev/build/smart-contracts/aptos-coin)
- [Aptos Oracle Guide](https://aptos.guide/build/guides/oracles)
- [Pyth Integration Docs](https://docs.pyth.network/price-feeds/aptos)
- [Aptos Testing Framework](https://aptos.dev/build/smart-contracts/book/unit-testing)
- [Fungible Asset Standard](https://aptos.dev/build/smart-contracts/fungible-asset)
- [Aptos Token v2 / Objects](https://medium.com/mokshyaprotocol/aptos-token-v2-a74fd1125a4)
- [Ankr Soulbound Token Guide](https://www.ankr.com/docs/smart-contract-tutorials/non-rentable-soulbound-nft/)
