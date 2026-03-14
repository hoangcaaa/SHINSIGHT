/// SHINSIGHT shared TypeScript types

export interface Call {
  id: number;
  call_id_onchain: number | null;
  kol_address: string;
  asset: number;
  direction: boolean;
  target_price: number | null; // null when sealed
  reveal_timestamp: string;
  unlock_price: number;
  content_hash: string;
  status: "active" | "settled_true" | "settled_false" | "expired";
  is_revealed: boolean;
  settlement_tx_hash: string | null;
  created_at: string;
}

export interface EscrowState {
  buyerCount: number;
  totalDeposited: number;
  isSettled: boolean;
}

export interface KolStats {
  kol_address: string;
  total_calls: number;
  true_calls: number;
  false_calls: number;
  expired_calls: number;
  total_escrow_earned: number;
  current_streak: number;
}

export interface Buyer {
  id: number;
  call_id: number;
  buyer_address: string;
  deposit_tx_hash: string;
  key_delivered: boolean;
  delivered_at: string | null;
}

/// Asset enum matching contract: 0=BTC, 1=ETH, 2=SOL, 3=BNB, 4=APT
export type AssetId = 0 | 1 | 2 | 3 | 4;
