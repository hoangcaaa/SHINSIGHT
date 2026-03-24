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
 * Submit settlement/expiry transaction via the settlement-service (Node.js).
 * The service uses @aptos-labs/ts-sdk for proper BCS-signed Ed25519 transactions.
 */
export async function submitSettlement(
  callIdOnchain: number,
  verdict: "settle" | "expire",
  asset?: number,
): Promise<{ hash: string; success: boolean }> {
  const serviceUrl = Deno.env.get("SETTLEMENT_SERVICE_URL");
  if (!serviceUrl) {
    console.warn("SETTLEMENT_SERVICE_URL not set — skipping on-chain settlement");
    return { hash: "", success: false };
  }

  const serviceSecret = Deno.env.get("SETTLEMENT_SERVICE_SECRET") ?? "";
  const endpoint = verdict === "settle" ? "/settle" : "/expire";

  const body = verdict === "settle"
    ? { call_id: callIdOnchain, asset: asset ?? 0 }
    : { call_id: callIdOnchain };

  try {
    const resp = await fetch(`${serviceUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(serviceSecret ? { Authorization: `Bearer ${serviceSecret}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // 30s timeout for on-chain tx
    });

    const result = await resp.json();
    return {
      hash: result.hash ?? "",
      success: result.success === true,
    };
  } catch (err) {
    console.error(`Settlement service call failed (${endpoint}):`, err);
    return { hash: "", success: false };
  }
}

/** Get the module address */
export function getModuleAddress(): string {
  return MODULE_ADDRESS;
}
