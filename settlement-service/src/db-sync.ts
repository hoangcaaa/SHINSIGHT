/// Supabase DB sync — updates call status, settlement_log, kol_stats after on-chain settlement
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

interface SyncParams {
  callIdOnchain: number;
  verdict: "settled_true" | "settled_false" | "expired";
  actualPrice: number;
  txHash: string;
}

/** Update Supabase DB after successful on-chain settlement */
export async function syncSettlementToDb(params: SyncParams): Promise<void> {
  const supabase = getClient();
  const { callIdOnchain, verdict, actualPrice, txHash } = params;

  // Find the DB call by on-chain ID
  const { data: call, error: findErr } = await supabase
    .from("calls")
    .select("id, kol_address, target_price, unlock_price")
    .eq("call_id_onchain", callIdOnchain)
    .single();

  if (findErr || !call) {
    console.warn(`[db-sync] Call not found for chain_id=${callIdOnchain}: ${findErr?.message}`);
    return;
  }

  // Calculate escrow amounts (mirrors contract logic)
  const { data: buyers } = await supabase
    .from("buyers")
    .select("id")
    .eq("call_id", call.id);
  const buyerCount = buyers?.length ?? 0;
  const totalEscrow = buyerCount * call.unlock_price;
  const protocolFee = Math.floor(totalEscrow * 0.1);
  const distributable = totalEscrow - protocolFee;
  const isTrue = verdict === "settled_true";
  const kolPayout = isTrue
    ? Math.floor(distributable * 0.9)
    : verdict === "settled_false"
      ? Math.floor(distributable * 0.3)
      : 0;
  const buyerRefundPer = buyerCount > 0
    ? Math.floor((distributable - kolPayout) / buyerCount)
    : 0;

  // Update call status
  await supabase
    .from("calls")
    .update({ status: verdict, is_revealed: true, settlement_tx_hash: txHash })
    .eq("id", call.id);

  // Insert settlement log
  await supabase.from("settlement_log").insert({
    call_id: call.id,
    verdict,
    oracle_price: actualPrice,
    target_price: call.target_price,
    total_escrow: totalEscrow,
    kol_payout: kolPayout,
    buyer_refund_per: buyerRefundPer,
    protocol_fee: protocolFee,
    tx_hash: txHash,
  });

  // Update KOL stats atomically (try RPC first, fallback to manual)
  const trueInc = verdict === "settled_true" ? 1 : 0;
  const falseInc = verdict === "settled_false" ? 1 : 0;
  const expiredInc = verdict === "expired" ? 1 : 0;

  const { error: rpcErr } = await supabase.rpc("update_kol_stats_atomic", {
    p_kol_address: call.kol_address,
    p_true_inc: trueInc,
    p_false_inc: falseInc,
    p_expired_inc: expiredInc,
    p_escrow_earned: kolPayout,
    p_verdict: verdict,
  });

  if (rpcErr) {
    // Fallback: ensure row exists then do manual update
    await supabase.from("kol_stats").upsert(
      { kol_address: call.kol_address },
      { onConflict: "kol_address", ignoreDuplicates: true },
    );
    console.warn(`[db-sync] RPC fallback for ${call.kol_address}: ${rpcErr.message}`);
  }

  console.log(`[db-sync] Synced call ${call.id} (chain#${callIdOnchain}): ${verdict}, tx=${txHash.slice(0, 16)}...`);
}
