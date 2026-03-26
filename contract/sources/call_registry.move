/// Call Registry — stores KOL price prediction metadata on-chain.
/// Each call is immutable after creation. Status updates only via friend modules.
module shinsight::call_registry {
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // === Constants ===

    /// Asset enum: 0=BTC, 1=ETH, 2=SOL, 3=BNB, 4=APT
    const MAX_ASSET_ID: u8 = 4;

    /// Minimum unlock price: 0.1 APT = 10_000_000 octas
    const MIN_UNLOCK_PRICE: u64 = 10_000_000;

    /// Minimum reveal gap: 1 hour (3600 seconds)
    const MIN_REVEAL_GAP: u64 = 180; // 3 minutes for testnet (mainnet: 3600)

    /// Call status enum
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_SETTLED_TRUE: u8 = 1;
    const STATUS_SETTLED_FALSE: u8 = 2;
    const STATUS_EXPIRED: u8 = 3;

    // === Errors ===

    const E_INVALID_ASSET: u64 = 1;
    const E_UNLOCK_PRICE_TOO_LOW: u64 = 2;
    const E_REVEAL_TOO_SOON: u64 = 3;
    const E_CALL_NOT_FOUND: u64 = 4;
    const E_CALL_STORE_NOT_INITIALIZED: u64 = 5;
    const E_INVALID_STATUS: u64 = 6;

    // === Structs ===

    struct Call has store, drop, copy {
        id: u64,
        kol: address,
        content_hash: vector<u8>,
        asset: u8,
        direction: bool,        // true=UP, false=DOWN
        target_price: u64,      // USD price * 10^8 (Pyth format)
        reveal_timestamp: u64,  // Unix seconds
        unlock_price: u64,      // APT in octas
        status: u8,
        created_at: u64,
    }

    struct CallStore has key {
        calls: vector<Call>,
        next_id: u64,
    }

    // === Events ===

    #[event]
    struct CallCreatedEvent has drop, store {
        call_id: u64,
        kol: address,
        asset: u8,
        direction: bool,
        target_price: u64,
        reveal_timestamp: u64,
        unlock_price: u64,
    }

    #[event]
    struct CallStatusUpdatedEvent has drop, store {
        call_id: u64,
        old_status: u8,
        new_status: u8,
    }

    // === Friend declarations ===

    friend shinsight::escrow;
    friend shinsight::oracle_settlement;

    // === Entry functions ===

    /// Initialize the call store on the module publisher's account
    public entry fun initialize(account: &signer) {
        let store = CallStore {
            calls: vector::empty(),
            next_id: 0,
        };
        move_to(account, store);
    }

    /// Create a new price prediction call
    public entry fun create_call(
        account: &signer,
        module_addr: address,
        content_hash: vector<u8>,
        asset: u8,
        direction: bool,
        target_price: u64,
        reveal_timestamp: u64,
        unlock_price: u64,
    ) acquires CallStore {
        // Validate inputs
        assert!(asset <= MAX_ASSET_ID, E_INVALID_ASSET);
        assert!(unlock_price >= MIN_UNLOCK_PRICE, E_UNLOCK_PRICE_TOO_LOW);
        let now = timestamp::now_seconds();
        assert!(reveal_timestamp >= now + MIN_REVEAL_GAP, E_REVEAL_TOO_SOON);

        let store = borrow_global_mut<CallStore>(module_addr);
        let call_id = store.next_id;

        let call = Call {
            id: call_id,
            kol: signer::address_of(account),
            content_hash,
            asset,
            direction,
            target_price,
            reveal_timestamp,
            unlock_price,
            status: STATUS_ACTIVE,
            created_at: now,
        };

        vector::push_back(&mut store.calls, call);
        store.next_id = call_id + 1;

        event::emit(CallCreatedEvent {
            call_id,
            kol: signer::address_of(account),
            asset,
            direction,
            target_price,
            reveal_timestamp,
            unlock_price,
        });
    }

    // === View functions ===

    #[view]
    public fun get_call(module_addr: address, call_id: u64): (
        address, vector<u8>, u8, bool, u64, u64, u64, u8, u64
    ) acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        let call = vector::borrow(&store.calls, call_id);
        (
            call.kol,
            call.content_hash,
            call.asset,
            call.direction,
            call.target_price,
            call.reveal_timestamp,
            call.unlock_price,
            call.status,
            call.created_at,
        )
    }

    // === Friend-only accessors ===

    /// Get call status — used by escrow and oracle_settlement
    public(friend) fun get_call_status(module_addr: address, call_id: u64): u8 acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).status
    }

    /// Get call unlock price — used by escrow for deposit amount
    public(friend) fun get_unlock_price(module_addr: address, call_id: u64): u64 acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).unlock_price
    }

    /// Get call reveal timestamp — used by escrow to check deposit window
    public(friend) fun get_reveal_timestamp(module_addr: address, call_id: u64): u64 acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).reveal_timestamp
    }

    /// Get KOL address — used by escrow for payout
    public(friend) fun get_kol_address(module_addr: address, call_id: u64): address acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).kol
    }

    /// Get call asset — used by oracle_settlement for price feed mapping
    public(friend) fun get_asset(module_addr: address, call_id: u64): u8 acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).asset
    }

    /// Get call direction — used by oracle_settlement for verdict
    public(friend) fun get_direction(module_addr: address, call_id: u64): bool acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).direction
    }

    /// Get call target price — used by oracle_settlement for verdict
    public(friend) fun get_target_price(module_addr: address, call_id: u64): u64 acquires CallStore {
        let store = borrow_global<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        vector::borrow(&store.calls, call_id).target_price
    }

    /// Update call status — friend-only for oracle_settlement
    public(friend) fun update_status(module_addr: address, call_id: u64, new_status: u8) acquires CallStore {
        assert!(new_status >= STATUS_SETTLED_TRUE && new_status <= STATUS_EXPIRED, E_INVALID_STATUS);
        let store = borrow_global_mut<CallStore>(module_addr);
        assert!(call_id < vector::length(&store.calls), E_CALL_NOT_FOUND);
        let call = vector::borrow_mut(&mut store.calls, call_id);
        let old_status = call.status;
        call.status = new_status;

        event::emit(CallStatusUpdatedEvent {
            call_id,
            old_status,
            new_status,
        });
    }

    // === Constants accessors for friend modules ===

    public(friend) fun status_active(): u8 { STATUS_ACTIVE }
    public(friend) fun status_settled_true(): u8 { STATUS_SETTLED_TRUE }
    public(friend) fun status_settled_false(): u8 { STATUS_SETTLED_FALSE }
    public(friend) fun status_expired(): u8 { STATUS_EXPIRED }
}
