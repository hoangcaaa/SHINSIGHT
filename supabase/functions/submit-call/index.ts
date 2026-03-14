/// Edge Function: submit-call
/// Receives KOL call data, encrypts it, stores in DB, returns content_hash
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptCallData, sha256Hash } from "../_shared/encryption.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { asset, direction, target_price, reveal_timestamp, unlock_price } =
      await req.json();

    // Validate inputs
    if (asset === undefined || direction === undefined || !target_price || !reveal_timestamp || !unlock_price) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get KOL address from auth header (wallet-signed JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const kolAddress = req.headers.get("X-Wallet-Address") ?? "";

    if (!kolAddress) {
      return new Response(JSON.stringify({ error: "Missing wallet address" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Serialize call data deterministically for hashing
    const callData = JSON.stringify({
      asset,
      direction,
      target_price,
      reveal_timestamp,
      unlock_price,
      kol: kolAddress,
    });

    // Encrypt call data
    const { ciphertext, key, iv } = await encryptCallData(callData);

    // Compute content hash of plaintext
    const contentHash = await sha256Hash(callData);

    // Store in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase.from("calls").insert({
      kol_address: kolAddress,
      asset,
      direction,
      target_price,
      reveal_timestamp: new Date(reveal_timestamp * 1000).toISOString(),
      unlock_price,
      content_hash: contentHash,
      encrypted_blob: ciphertext,
      decryption_key: key,
      encryption_iv: iv,
    }).select("id").single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        call_id: data.id,
        content_hash: contentHash,
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
