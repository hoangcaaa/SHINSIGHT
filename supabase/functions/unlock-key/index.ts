/// Edge Function: unlock-key
/// Verifies on-chain buyer deposit, serves decryption key
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyDeposit } from "../_shared/aptos-client.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { call_id, buyer_address, tx_hash } = await req.json();

    if (!call_id || !buyer_address || !tx_hash) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch call record
    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("id, call_id_onchain, decryption_key, encrypted_blob, encryption_iv, status")
      .eq("id", call_id)
      .single();

    if (callErr || !call) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (call.status !== "active") {
      return new Response(JSON.stringify({ error: "Call is not active" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if buyer already has key
    const { data: existing } = await supabase
      .from("buyers")
      .select("id")
      .eq("call_id", call_id)
      .eq("buyer_address", buyer_address)
      .single();

    if (existing) {
      // Already delivered — return key again
      return new Response(
        JSON.stringify({
          decryption_key: call.decryption_key,
          encrypted_blob: call.encrypted_blob,
          encryption_iv: call.encryption_iv,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify on-chain deposit
    const depositVerified = await verifyDeposit(
      buyer_address,
      call.call_id_onchain,
    );

    if (!depositVerified) {
      return new Response(JSON.stringify({ error: "Deposit not verified on-chain" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Record buyer and deliver key
    await supabase.from("buyers").insert({
      call_id,
      buyer_address,
      deposit_tx_hash: tx_hash,
      key_delivered: true,
      delivered_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        decryption_key: call.decryption_key,
        encrypted_blob: call.encrypted_blob,
        encryption_iv: call.encryption_iv,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
