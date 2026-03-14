/// Aptos RPC client helper for verifying on-chain state

const APTOS_NODE_URL = Deno.env.get("APTOS_NODE_URL") ??
  "https://fullnode.testnet.aptoslabs.com/v1";
const MODULE_ADDRESS = Deno.env.get("MODULE_ADDRESS") ??
  "0xf526cbc526a400390a5e180730fe516e12ccb724e59c70217bca81c3ea4598e9";

/** Verify a buyer's deposit event exists on-chain for a given call */
export async function verifyDeposit(
  buyerAddress: string,
  callIdOnchain: number,
): Promise<boolean> {
  // Query events from the escrow module
  const url =
    `${APTOS_NODE_URL}/accounts/${MODULE_ADDRESS}/events/${MODULE_ADDRESS}::escrow::BuyerDepositEvent`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return false;

    const events = await resp.json();
    // Check if any deposit event matches buyer + call_id
    return events.some(
      (e: { data: { buyer: string; call_id: string } }) =>
        e.data.buyer === buyerAddress &&
        e.data.call_id === String(callIdOnchain),
    );
  } catch {
    return false;
  }
}

/** Submit a transaction to the Aptos network */
export async function submitTransaction(
  payload: Record<string, unknown>,
): Promise<{ hash: string; success: boolean }> {
  const privateKey = Deno.env.get("ORACLE_PRIVATE_KEY");
  if (!privateKey) throw new Error("ORACLE_PRIVATE_KEY not set");

  // Use Aptos REST API to submit transaction
  // In production, use @aptos-labs/ts-sdk for proper signing
  const resp = await fetch(`${APTOS_NODE_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await resp.json();
  return {
    hash: result.hash ?? "",
    success: resp.ok,
  };
}

/** Get the module address */
export function getModuleAddress(): string {
  return MODULE_ADDRESS;
}
