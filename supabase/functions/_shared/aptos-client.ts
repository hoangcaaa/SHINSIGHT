/// Aptos RPC client helper for verifying on-chain state and submitting txns

const APTOS_NODE_URL = Deno.env.get("APTOS_NODE_URL") ??
  "https://fullnode.testnet.aptoslabs.com/v1";
const MODULE_ADDRESS = Deno.env.get("MODULE_ADDRESS") ??
  "0xf526cbc526a400390a5e180730fe516e12ccb724e59c70217bca81c3ea4598e9";

/**
 * Verify a buyer's deposit event exists on-chain for a given call.
 * Scans the buyer's recent transactions for a successful escrow::deposit call
 * that emitted a BuyerDepositEvent matching the call_id and buyer address.
 */
export async function verifyDeposit(
  buyerAddress: string,
  callIdOnchain: number,
): Promise<boolean> {
  if (!buyerAddress || callIdOnchain === null || callIdOnchain === undefined) {
    return false;
  }

  try {
    // Query buyer's recent transactions for deposit events
    const url = `${APTOS_NODE_URL}/accounts/${buyerAddress}/transactions?limit=50`;
    const resp = await fetch(url);
    if (!resp.ok) return false;

    const txns = await resp.json();
    return txns.some(
      (tx: {
        success?: boolean;
        payload?: { function?: string };
        events?: Array<{ type: string; data: Record<string, string> }>;
      }) => {
        if (!tx.success) return false;
        if (!tx.payload?.function?.includes("escrow::deposit")) return false;
        return tx.events?.some(
          (e) =>
            e.type.includes("BuyerDepositEvent") &&
            String(e.data.call_id) === String(callIdOnchain) &&
            e.data.buyer === buyerAddress,
        ) ?? false;
      },
    );
  } catch {
    return false;
  }
}

/**
 * Submit settlement/expiry transaction to Aptos.
 *
 * KNOWN LIMITATION (MVP): The Aptos REST API requires BCS-signed transactions.
 * The @aptos-labs/ts-sdk is not available in Deno Edge Functions.
 * For MVP, on-chain settlement is attempted via the REST API but may fail
 * if BCS signing is required. The settle-call function falls back gracefully
 * to DB-only settlement (verdict + stats updated in Supabase).
 *
 * POST-MVP: Replace with a Node.js backend service that uses @aptos-labs/ts-sdk
 * for proper Ed25519 signing of settlement transactions.
 */
export async function submitSettlement(
  callIdOnchain: number,
  verdict: "settle" | "expire",
  pythVaaBase64?: string,
): Promise<{ hash: string; success: boolean }> {
  const privateKeyHex = Deno.env.get("ORACLE_PRIVATE_KEY");
  if (!privateKeyHex) {
    console.warn("ORACLE_PRIVATE_KEY not set — skipping on-chain settlement");
    return { hash: "", success: false };
  }

  const oracleAddress = Deno.env.get("ORACLE_ADDRESS") ?? MODULE_ADDRESS;

  const fnName = verdict === "settle"
    ? `${MODULE_ADDRESS}::oracle_settlement::settle`
    : `${MODULE_ADDRESS}::oracle_settlement::expire`;

  // Convert base64 VAA to hex if provided (Pyth Hermes returns base64)
  let vaaHex = "";
  if (pythVaaBase64) {
    try {
      const raw = atob(pythVaaBase64);
      vaaHex = Array.from(raw, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    } catch {
      console.warn("Failed to decode VAA base64, using empty");
    }
  }

  const args = verdict === "settle"
    ? [MODULE_ADDRESS, callIdOnchain.toString(), vaaHex]
    : [MODULE_ADDRESS, callIdOnchain.toString()];

  const payload = {
    type: "entry_function_payload",
    function: fnName,
    type_arguments: [] as string[],
    arguments: args,
  };

  try {
    const acctResp = await fetch(`${APTOS_NODE_URL}/accounts/${oracleAddress}`);
    if (!acctResp.ok) throw new Error(`Account fetch failed: ${acctResp.status}`);
    const acctData = await acctResp.json();

    // Attempt REST API submission (requires BCS signing — may fail on real nodes)
    const txResp = await fetch(`${APTOS_NODE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: oracleAddress,
        sequence_number: acctData.sequence_number,
        max_gas_amount: "10000",
        gas_unit_price: "100",
        expiration_timestamp_secs: String(Math.floor(Date.now() / 1000) + 600),
        payload,
      }),
    });

    const result = await txResp.json();
    if (!txResp.ok) {
      console.warn("On-chain settlement rejected (BCS signing required):", result.message ?? result);
    }
    return {
      hash: result.hash ?? "",
      success: txResp.ok && !result.error_code,
    };
  } catch (err) {
    console.error("submitSettlement failed:", err);
    return { hash: "", success: false };
  }
}

/** Get the module address */
export function getModuleAddress(): string {
  return MODULE_ADDRESS;
}
