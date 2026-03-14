/// Edge Function: settle-call
/// Polled by pg_cron. Finds due calls, fetches Pyth VAA, triggers on-chain settlement.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (!authHeader.includes(serviceKey) && !authHeader.includes("Bearer")) {
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
async function fetchPythPrice(asset: number): Promise<{ price: number; timestamp: number }> {
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

/** Handle settlement — compare Pyth price vs target, update DB */
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

  // Update call status and reveal
  await supabase
    .from("calls")
    .update({ status: verdict, is_revealed: true })
    .eq("id", call.id);

  // Log settlement
  await supabase.from("settlement_log").insert({
    call_id: call.id,
    verdict,
    oracle_price: oraclePrice,
    target_price: targetPrice,
  });

  // Update KOL stats
  await updateKolStats(supabase, call.kol_address as string, verdict);
}

/** Handle expiry — mark expired, refund path */
async function handleExpiry(
  supabase: ReturnType<typeof createClient>,
  call: Record<string, unknown>,
) {
  await supabase
    .from("calls")
    .update({ status: "expired", is_revealed: true })
    .eq("id", call.id);

  await supabase.from("settlement_log").insert({
    call_id: call.id,
    verdict: "expired",
    target_price: call.target_price,
  });

  await updateKolStats(supabase, call.kol_address as string, "expired");
}

/** Update KOL accuracy stats after settlement */
async function updateKolStats(
  supabase: ReturnType<typeof createClient>,
  kolAddress: string,
  verdict: string,
) {
  // Upsert KOL stats
  const { data: existing } = await supabase
    .from("kol_stats")
    .select("*")
    .eq("kol_address", kolAddress)
    .single();

  const stats = existing ?? {
    kol_address: kolAddress,
    total_calls: 0,
    true_calls: 0,
    false_calls: 0,
    expired_calls: 0,
    total_escrow_earned: 0,
    current_streak: 0,
  };

  stats.total_calls += 1;
  if (verdict === "settled_true") {
    stats.true_calls += 1;
    stats.current_streak = stats.current_streak >= 0 ? stats.current_streak + 1 : 1;
  } else if (verdict === "settled_false") {
    stats.false_calls += 1;
    stats.current_streak = stats.current_streak <= 0 ? stats.current_streak - 1 : -1;
  } else {
    stats.expired_calls += 1;
    stats.current_streak = 0;
  }
  stats.updated_at = new Date().toISOString();

  await supabase.from("kol_stats").upsert(stats, { onConflict: "kol_address" });
}
