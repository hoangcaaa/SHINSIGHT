/// Oracle Settlement — reads Pyth on-chain price, computes verdict, triggers escrow split.
/// Only authorized oracle (protocol admin) can call settle/expire.
module shinsight::oracle_settlement {
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use pyth::pyth;
    use pyth::price_identifier;
    use pyth::i64;
    use pyth::price;
    use shinsight::call_registry;
    use shinsight::escrow;

    // === Constants ===

    /// Max price staleness: 300 seconds (5 minutes)
    const MAX_STALENESS_SECONDS: u64 = 300;

    /// Grace period after reveal_timestamp before expiry is allowed: 1 hour
    const EXPIRY_GRACE_PERIOD: u64 = 3600;

    // === Errors ===

    const E_NOT_AUTHORIZED: u64 = 201;
    const E_CALL_NOT_ACTIVE: u64 = 202;
    const E_TOO_EARLY_TO_SETTLE: u64 = 203;
    const E_PRICE_TOO_STALE: u64 = 204;
    const E_INVALID_ASSET: u64 = 205;
    const E_TOO_EARLY_TO_EXPIRE: u64 = 206;

    // === Structs ===

    /// Stores authorized oracle address — deployed once
    struct OracleConfig has key {
        admin: address,
    }

    // === Events ===

    #[event]
    struct VerdictEvent has drop, store {
        call_id: u64,
        asset: u8,
        actual_price: u64,
        target_price: u64,
        direction: bool,
        verdict: u8,
    }

    #[event]
    struct ExpiredEvent has drop, store {
        call_id: u64,
    }

    // === Entry functions ===

    /// Initialize oracle config — sets deployer as admin
    public entry fun initialize(account: &signer) {
        let config = OracleConfig {
            admin: signer::address_of(account),
        };
        move_to(account, config);
    }

    /// Settle a call using Pyth oracle price.
    /// Caller must pass fresh Pyth price update VAA data.
    public entry fun settle(
        account: &signer,
        module_addr: address,
        call_id: u64,
        pyth_update_data: vector<vector<u8>>,
    ) acquires OracleConfig {
        // Auth check
        let config = borrow_global<OracleConfig>(module_addr);
        assert!(signer::address_of(account) == config.admin, E_NOT_AUTHORIZED);

        // Verify call is active
        let status = call_registry::get_call_status(module_addr, call_id);
        assert!(status == call_registry::status_active(), E_CALL_NOT_ACTIVE);

        // Verify reveal_timestamp has passed
        let reveal_ts = call_registry::get_reveal_timestamp(module_addr, call_id);
        assert!(timestamp::now_seconds() >= reveal_ts, E_TOO_EARLY_TO_SETTLE);

        // Get call details
        let asset = call_registry::get_asset(module_addr, call_id);
        let direction = call_registry::get_direction(module_addr, call_id);
        let target_price = call_registry::get_target_price(module_addr, call_id);

        // Get Pyth price feed ID for asset
        let price_feed_id = get_price_feed_id(asset);

        // Pay Pyth update fee and update price feeds
        let update_fee = pyth::get_update_fee(&pyth_update_data);
        let fee_coins = coin::withdraw<AptosCoin>(account, update_fee);
        pyth::update_price_feeds(pyth_update_data, fee_coins);

        // Read current price
        let price_obj = pyth::get_price(price_identifier::from_byte_vec(price_feed_id));
        let price_val = price::get_price(&price_obj);
        let price_timestamp = price::get_timestamp(&price_obj);

        // Staleness check
        let now = timestamp::now_seconds();
        assert!(now - price_timestamp <= MAX_STALENESS_SECONDS, E_PRICE_TOO_STALE);

        // Convert Pyth I64 price to u64 (prices are positive)
        let actual_price = i64::get_magnitude_if_positive(&price_val);

        // Compute verdict based on direction
        let is_correct = if (direction) {
            // UP: actual >= target means correct
            actual_price >= target_price
        } else {
            // DOWN: actual <= target means correct
            actual_price <= target_price
        };

        let verdict = if (is_correct) {
            call_registry::status_settled_true()
        } else {
            call_registry::status_settled_false()
        };

        // Execute settlement in escrow
        escrow::execute_settlement(module_addr, call_id, verdict);

        // Update call status
        call_registry::update_status(module_addr, call_id, verdict);

        event::emit(VerdictEvent {
            call_id,
            asset,
            actual_price,
            target_price,
            direction,
            verdict,
        });
    }

    /// Expire a call that wasn't settled within the grace period.
    /// Refunds all buyers 100%.
    public entry fun expire(
        account: &signer,
        module_addr: address,
        call_id: u64,
    ) acquires OracleConfig {
        // Auth check
        let config = borrow_global<OracleConfig>(module_addr);
        assert!(signer::address_of(account) == config.admin, E_NOT_AUTHORIZED);

        // Verify call is active
        let status = call_registry::get_call_status(module_addr, call_id);
        assert!(status == call_registry::status_active(), E_CALL_NOT_ACTIVE);

        // Verify grace period has elapsed
        let reveal_ts = call_registry::get_reveal_timestamp(module_addr, call_id);
        assert!(
            timestamp::now_seconds() >= reveal_ts + EXPIRY_GRACE_PERIOD,
            E_TOO_EARLY_TO_EXPIRE,
        );

        // Refund all buyers
        escrow::refund_all(module_addr, call_id);

        // Update call status
        call_registry::update_status(module_addr, call_id, call_registry::status_expired());

        event::emit(ExpiredEvent { call_id });
    }

    // === Internal helpers ===

    /// Map asset enum to Pyth price feed ID (devnet)
    fun get_price_feed_id(asset: u8): vector<u8> {
        if (asset == 0) {
            // BTC/USD
            x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
        } else if (asset == 1) {
            // ETH/USD
            x"ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
        } else if (asset == 2) {
            // SOL/USD
            x"ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
        } else if (asset == 3) {
            // BNB/USD
            x"2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f"
        } else if (asset == 4) {
            // APT/USD
            x"03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5"
        } else {
            abort E_INVALID_ASSET
        }
    }
}
