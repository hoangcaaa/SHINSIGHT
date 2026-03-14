/// Escrow — holds buyer deposits per call, splits funds on settlement.
/// Funds only move via verdict logic — no admin withdrawal.
module shinsight::escrow {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::simple_map::{Self, SimpleMap};
    use shinsight::call_registry;

    // === Constants ===

    /// Protocol fee: 10%
    const PROTOCOL_FEE_BPS: u64 = 1000; // basis points
    const BPS_DENOMINATOR: u64 = 10000;

    /// FALSE verdict: KOL gets 30% of distributable, buyers get 70%
    const FALSE_KOL_BPS: u64 = 3000;

    // === Errors ===

    const E_CALL_NOT_ACTIVE: u64 = 101;
    const E_DEPOSIT_WINDOW_CLOSED: u64 = 102;
    const E_ALREADY_DEPOSITED: u64 = 103;
    const E_POOL_NOT_FOUND: u64 = 104;
    const E_ALREADY_SETTLED: u64 = 105;
    const E_NO_BUYERS: u64 = 106;
    const E_ESCROW_STORE_NOT_INITIALIZED: u64 = 107;
    const E_KOL_CANNOT_BUY_OWN_CALL: u64 = 108;

    // === Structs ===

    /// Tracks a single buyer's deposit info
    struct BuyerDeposit has store, drop, copy {
        buyer: address,
        amount: u64,
    }

    /// Escrow pool for a single call
    struct EscrowPool has store {
        call_id: u64,
        coins: coin::Coin<AptosCoin>,
        buyers: vector<BuyerDeposit>,
        buyer_map: SimpleMap<address, u64>, // address -> deposit index
        total_deposited: u64,
        is_settled: bool,
    }

    /// Global store of all escrow pools, keyed by module publisher
    struct EscrowStore has key {
        pools: SimpleMap<u64, EscrowPool>, // call_id -> pool
        protocol_address: address,
    }

    // === Events ===

    #[event]
    struct BuyerDepositEvent has drop, store {
        call_id: u64,
        buyer: address,
        amount: u64,
        total_buyers: u64,
    }

    #[event]
    struct SettlementEvent has drop, store {
        call_id: u64,
        verdict: u8,
        total_pool: u64,
        kol_payout: u64,
        protocol_fee: u64,
        buyer_refund_each: u64,
    }

    // === Friend declarations ===

    friend shinsight::oracle_settlement;

    // === Entry functions ===

    /// Initialize escrow store on module publisher's account
    public entry fun initialize(account: &signer) {
        let store = EscrowStore {
            pools: simple_map::new(),
            protocol_address: signer::address_of(account),
        };
        move_to(account, store);
    }

    /// Buyer deposits unlock_price APT into escrow for a call
    public entry fun deposit(
        account: &signer,
        module_addr: address,
        call_id: u64,
    ) acquires EscrowStore {
        let buyer_addr = signer::address_of(account);

        // Verify call is active
        let status = call_registry::get_call_status(module_addr, call_id);
        assert!(status == call_registry::status_active(), E_CALL_NOT_ACTIVE);

        // Verify deposit window is open (before reveal_timestamp)
        let reveal_ts = call_registry::get_reveal_timestamp(module_addr, call_id);
        assert!(timestamp::now_seconds() < reveal_ts, E_DEPOSIT_WINDOW_CLOSED);

        // KOL cannot buy their own call
        let kol_addr = call_registry::get_kol_address(module_addr, call_id);
        assert!(buyer_addr != kol_addr, E_KOL_CANNOT_BUY_OWN_CALL);

        let unlock_price = call_registry::get_unlock_price(module_addr, call_id);
        let store = borrow_global_mut<EscrowStore>(module_addr);

        // Create pool if first deposit for this call
        if (!simple_map::contains_key(&store.pools, &call_id)) {
            let pool = EscrowPool {
                call_id,
                coins: coin::zero<AptosCoin>(),
                buyers: vector::empty(),
                buyer_map: simple_map::new(),
                total_deposited: 0,
                is_settled: false,
            };
            simple_map::add(&mut store.pools, call_id, pool);
        };

        let pool = simple_map::borrow_mut(&mut store.pools, &call_id);

        // Prevent double deposit
        assert!(!simple_map::contains_key(&pool.buyer_map, &buyer_addr), E_ALREADY_DEPOSITED);

        // Withdraw coins from buyer
        let payment = coin::withdraw<AptosCoin>(account, unlock_price);
        coin::merge(&mut pool.coins, payment);

        // Record deposit
        let deposit_idx = vector::length(&pool.buyers);
        vector::push_back(&mut pool.buyers, BuyerDeposit {
            buyer: buyer_addr,
            amount: unlock_price,
        });
        simple_map::add(&mut pool.buyer_map, buyer_addr, deposit_idx);
        pool.total_deposited = pool.total_deposited + unlock_price;

        let total_buyers = vector::length(&pool.buyers);

        event::emit(BuyerDepositEvent {
            call_id,
            buyer: buyer_addr,
            amount: unlock_price,
            total_buyers,
        });
    }

    // === Friend-only settlement functions ===

    /// Execute settlement — splits funds based on verdict.
    /// Called by oracle_settlement after Pyth price comparison.
    public(friend) fun execute_settlement(
        module_addr: address,
        call_id: u64,
        verdict: u8,
    ) acquires EscrowStore {
        let store = borrow_global_mut<EscrowStore>(module_addr);

        // If no pool exists (0 buyers), nothing to settle
        if (!simple_map::contains_key(&store.pools, &call_id)) {
            return
        };

        let pool = simple_map::borrow_mut(&mut store.pools, &call_id);
        assert!(!pool.is_settled, E_ALREADY_SETTLED);

        let total = pool.total_deposited;
        let buyer_count = vector::length(&pool.buyers);

        // Handle 0 buyers gracefully
        if (buyer_count == 0 || total == 0) {
            pool.is_settled = true;
            return
        };

        let kol_addr = call_registry::get_kol_address(module_addr, call_id);
        let protocol_addr = store.protocol_address;

        let kol_payout: u64;
        let protocol_fee: u64;
        let buyer_refund_each: u64;

        if (verdict == call_registry::status_expired()) {
            // EXPIRED: 100% back to buyers, no protocol fee
            protocol_fee = 0;
            kol_payout = 0;
            buyer_refund_each = total / buyer_count;
        } else {
            // TRUE or FALSE: 10% protocol fee
            protocol_fee = total * PROTOCOL_FEE_BPS / BPS_DENOMINATOR;
            let distributable = total - protocol_fee;

            if (verdict == call_registry::status_settled_true()) {
                // TRUE: 90% distributable to KOL
                kol_payout = distributable;
                buyer_refund_each = 0;
            } else {
                // FALSE: 30% KOL, 70% buyers
                kol_payout = distributable * FALSE_KOL_BPS / BPS_DENOMINATOR;
                let buyer_refund_total = distributable - kol_payout;
                buyer_refund_each = buyer_refund_total / buyer_count;
            };
        };

        // Transfer KOL payout
        if (kol_payout > 0) {
            let kol_coins = coin::extract(&mut pool.coins, kol_payout);
            coin::deposit(kol_addr, kol_coins);
        };

        // Transfer protocol fee
        if (protocol_fee > 0) {
            let fee_coins = coin::extract(&mut pool.coins, protocol_fee);
            coin::deposit(protocol_addr, fee_coins);
        };

        // Refund buyers (for FALSE and EXPIRED verdicts)
        if (buyer_refund_each > 0) {
            let i = 0;
            while (i < buyer_count) {
                let dep = vector::borrow(&pool.buyers, i);
                let refund_coins = coin::extract(&mut pool.coins, buyer_refund_each);
                coin::deposit(dep.buyer, refund_coins);
                i = i + 1;
            };
        };

        // Any dust remains in pool (rounding)
        pool.is_settled = true;

        event::emit(SettlementEvent {
            call_id,
            verdict,
            total_pool: total,
            kol_payout,
            protocol_fee,
            buyer_refund_each,
        });
    }

    /// Refund all buyers — for EXPIRED path
    public(friend) fun refund_all(
        module_addr: address,
        call_id: u64,
    ) acquires EscrowStore {
        execute_settlement(module_addr, call_id, call_registry::status_expired());
    }

    // === View functions ===

    #[view]
    public fun get_pool_info(module_addr: address, call_id: u64): (u64, u64, bool) acquires EscrowStore {
        let store = borrow_global<EscrowStore>(module_addr);
        if (!simple_map::contains_key(&store.pools, &call_id)) {
            return (0, 0, false)
        };
        let pool = simple_map::borrow(&store.pools, &call_id);
        (pool.total_deposited, vector::length(&pool.buyers), pool.is_settled)
    }
}
