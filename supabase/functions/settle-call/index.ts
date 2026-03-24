/// Edge Function: settle-call
/// Polled by pg_cron. Finds due calls, fetches Pyth VAA, triggers on-chain settlement.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { submitSettlement } from "../_shared/aptos-client.ts";

// Pyth price feed IDs (testnet)
const PRICE_FEED_IDS: Record<number, string> = {
  0: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // BTC
  1: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH
  2: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL
  3: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB
  4: "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5", // APT
};

const HERMES_URL = Deno.env.get("PYTH_PRICE_SERVICE_URL") ?? "https://hermes.pyth.network";
const EXPIRY_GRACE_SECONDS = 3600; // 1 hour grace before marking expired

serve(async (req) => {
  // Auth check — only service_role or cron should call this
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!serviceKey || token !== serviceKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
    );

    const now = new Date();

    // Find active calls past reveal_timestamp
    const { data: dueCalls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("status", "active")
      .lte("reveal_timestamp", now.toISOString())
      .order("reveal_timestamp", { ascending: true })
      .limit(10); // Process batch of 10

    if (error || !dueCalls || dueCalls.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const results: Array<{ call_id: number; status: string }> = [];

    for (const call of dueCalls) {
      try {
        const revealTime = new Date(call.reveal_timestamp).getTime() / 1000;
        const nowSecs = Math.floor(now.getTime() / 1000);

        // Check if past expiry grace period
        if (nowSecs >= revealTime + EXPIRY_GRACE_SECONDS) {
          // EXPIRE path — refund all buyers
          await handleExpiry(supabase, call);
          results.push({ call_id: call.id, status: "expired" });
        } else {
          // SETTLE path — get Pyth price and determine verdict
          await handleSettlement(supabase, call);
          results.push({ call_id: call.id, status: "settled" });
        }
        processed++;
      } catch (err) {
        // Log error, continue to next call — retry on next cycle
        console.error(`Failed to process call ${call.id}:`, err);
        results.push({ call_id: call.id, status: `error: ${err}` });
      }
    }

    return new Response(JSON.stringify({ processed, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/** Fetch latest Pyth price for an asset */
async function fetchPythPrice(
  asset: number,
): Promise<{ price: number; timestamp: number }> {
  const feedId = PRICE_FEED_IDS[asset];
  if (!feedId) throw new Error(`Unknown asset: ${asset}`);

  const resp = await fetch(
    `${HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}`,
  );
  if (!resp.ok) throw new Error(`Pyth API error: ${resp.status}`);

  const data = await resp.json();
  const parsed = data.parsed?.[0]?.price;
  if (!parsed) throw new Error("No price data from Pyth");

  // Price is returned as string with exponent — convert to integer
  const priceVal = Math.abs(Number(parsed.price));
  return { price: priceVal, timestamp: Number(parsed.publish_time) };
}

/** Handle settlement — compare Pyth price vs target, trigger on-chain, update DB */
async function handleSettlement(
  supabase: ReturnType<typeof createClient>,
  call: Record<string, unknown>,
) {
  const { price: oraclePrice } = await fetchPythPrice(call.asset as number);
  const targetPrice = call.target_price as number;
  const direction = call.direction as boolean;

  // Verdict logic matches contract
  const isCorrect = direction
    ? oraclePrice >= targetPrice // UP
    : oraclePrice <= targetPrice; // DOWN

  const verdict = isCorrect ? "settled_true" : "settled_false";

  // Trigger on-chain settlement (best-effort for MVP)
  let settlementTxHash: string | null = null;
  if (call.call_id_onchain) {
    try {
      const txResult = await submitSettlement(
        call.call_id_onchain as number,
        "settle",
        call.asset as number,
      );
      if (txResult.success) settlementTxHash = txResult.hash;
    } catch (err) {
      console.error(`On-chain settle failed for call ${call.id}:`, err);
    }
  }

  // Calculate escrow amounts (match contract: 10% protocol, 90/30 KOL split)
  const { data: buyers } = await supabase
    .from("buyers")
    .select("id")
    .eq("call_id", call.id);
  const buyerCount = buyers?.length ?? 0;
  const totalEscrow = buyerCount * (call.unlock_price as number);
  const protocolFee = Math.floor(totalEscrow * 0.1);
  const distributable = totalEscrow - protocolFee;
  const kolPayout = isCorrect
    ? Math.floor(distributable * 0.9)
    : Math.floor(distributable * 0.3);
  const buyerRefundPer = buyerCount > 0
    ? Math.floor((distributable - kolPayout) / buyerCount)
    : 0;

  // Update call status and reveal
  await supabase
    .from("calls")
    .update({
      status: verdict,
      is_revealed: true,
      settlement_tx_hash: settlementTxHash,
    })
    .eq("id", call.id);

  // Log settlement with amounts
  await supabase.from("settlement_log").insert({
    call_id: call.id,
    verdict,
    oracle_price: oraclePrice,
    target_price: targetPrice,
    total_escrow: totalEscrow,
    kol_payout: kolPayout,
    buyer_refund_per: buyerRefundPer,
    protocol_fee: protocolFee,
    tx_hash: settlementTxHash,
  });

  // Update KOL stats
  await updateKolStats(supabase, call.kol_address as string, verdict, kolPayout);
}

/** Handle expiry — trigger on-chain refund, mark expired */
async function handleExpiry(
  supabase: ReturnType<typeof createClient>,
  call: Record<string, unknown>,
) {
  let expiryTxHash: string | null = null;
  if (call.call_id_onchain) {
    try {
      const txResult = await submitSettlement(
        call.call_id_onchain as number,
        "expire",
      );
      if (txResult.success) expiryTxHash = txResult.hash;
    } catch (err) {
      console.error(`On-chain expire failed for call ${call.id}:`, err);
    }
  }

  await supabase
    .from("calls")
    .update({ status: "expired", is_revealed: true, settlement_tx_hash: expiryTxHash })
    .eq("id", call.id);

  await supabase.from("settlement_log").insert({
    call_id: call.id,
    verdict: "expired",
    target_price: call.target_price,
    tx_hash: expiryTxHash,
  });

  await updateKolStats(supabase, call.kol_address as string, "expired", 0);
}

/** Update KOL accuracy stats after settlement using atomic SQL via RPC */
async function updateKolStats(
  supabase: ReturnType<typeof createClient>,
  kolAddress: string,
  verdict: string,
  escrowEarned: number = 0,
) {
  // Ensure KOL row exists (upsert with defaults)
  await supabase.from("kol_stats").upsert(
    { kol_address: kolAddress },
    { onConflict: "kol_address", ignoreDuplicates: true },
  );

  // Atomic increments to avoid read-modify-write race conditions
  const trueInc = verdict === "settled_true" ? 1 : 0;
  const falseInc = verdict === "settled_false" ? 1 : 0;
  const expiredInc = verdict === "expired" ? 1 : 0;

  // Compute new streak value
  // TRUE: positive streak (reset to 1 if was negative), FALSE: negative streak, EXPIRED: reset to 0
  let streakExpr: string;
  if (verdict === "settled_true") {
    streakExpr = "CASE WHEN current_streak >= 0 THEN current_streak + 1 ELSE 1 END";
  } else if (verdict === "settled_false") {
    streakExpr = "CASE WHEN current_streak <= 0 THEN current_streak - 1 ELSE -1 END";
  } else {
    streakExpr = "0";
  }

  // Use raw SQL for atomic update (Supabase .rpc or direct update with incrementing)
  await supabase.rpc("update_kol_stats_atomic", {
    p_kol_address: kolAddress,
    p_true_inc: trueInc,
    p_false_inc: falseInc,
    p_expired_inc: expiredInc,
    p_escrow_earned: escrowEarned,
    p_verdict: verdict,
  }).then(() => {}).catch(async () => {
    // Fallback: if RPC not available, use standard update (non-atomic but functional)
    const { data: existing } = await supabase
      .from("kol_stats")
      .select("*")
      .eq("kol_address", kolAddress)
      .single();

    if (!existing) return;

    existing.total_calls += 1;
    existing.true_calls += trueInc;
    existing.false_calls += falseInc;
    existing.expired_calls += expiredInc;
    existing.total_escrow_earned += escrowEarned;
    if (verdict === "settled_true") {
      existing.current_streak = existing.current_streak >= 0 ? existing.current_streak + 1 : 1;
    } else if (verdict === "settled_false") {
      existing.current_streak = existing.current_streak <= 0 ? existing.current_streak - 1 : -1;
    } else {
      existing.current_streak = 0;
    }
    existing.updated_at = new Date().toISOString();

    await supabase.from("kol_stats").upsert(existing, { onConflict: "kol_address" });
  });
}
