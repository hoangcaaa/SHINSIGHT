/// Edge Function: link-call-onchain
/// After on-chain create_call tx, extract call_id from events and link to Supabase record.
/// Verifies tx sender matches the KOL address stored in the DB call record.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APTOS_NODE_URL = Deno.env.get("APTOS_NODE_URL") ??
  "https://fullnode.testnet.aptoslabs.com/v1";
const MODULE_ADDRESS = Deno.env.get("MODULE_ADDRESS") ??
  "0xf526cbc526a400390a5e180730fe516e12ccb724e59c70217bca81c3ea4598e9";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // exponential backoff

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { call_db_id, tx_hash } = await req.json();
    if (!call_db_id || !tx_hash) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch the DB call record to verify ownership
    const { data: callRecord, error: callErr } = await supabase
      .from("calls")
      .select("id, kol_address, call_id_onchain")
      .eq("id", call_db_id)
      .single();

    if (callErr || !callRecord) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Don't overwrite if already linked
    if (callRecord.call_id_onchain !== null) {
      return new Response(
        JSON.stringify({ call_id_onchain: callRecord.call_id_onchain }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Extract call_id from tx with retry logic
    const result = await extractCallIdFromTx(tx_hash);
    if (!result) {
      return new Response(JSON.stringify({ error: "Could not extract call_id from tx" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify tx sender matches the KOL address stored in DB (prevents hijacking)
    if (result.sender.toLowerCase() !== callRecord.kol_address.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Tx sender does not match KOL address" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: updateErr, count } = await supabase
      .from("calls")
      .update({ call_id_onchain: result.callId })
      .eq("id", call_db_id)
      .is("call_id_onchain", null); // Only update if still null (prevent races)

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: `DB update failed: ${updateErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ call_id_onchain: result.callId, updated: count }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/** Fetch tx details from Aptos with exponential backoff retry */
async function extractCallIdFromTx(
  txHash: string,
): Promise<{ callId: number; sender: string } | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));

    const resp = await fetch(`${APTOS_NODE_URL}/transactions/by_hash/${txHash}`);
    if (!resp.ok) continue;

    const tx = await resp.json();
    if (!tx.success) continue; // tx exists but failed

    const event = tx.events?.find(
      (e: { type: string }) =>
        e.type.includes("call_registry::CallCreatedEvent") ||
        e.type.includes("call_registry::CallCreated"),
    );

    if (event?.data?.call_id !== undefined) {
      return {
        callId: Number(event.data.call_id),
        sender: tx.sender ?? "",
      };
    }
  }
  return null;
}
