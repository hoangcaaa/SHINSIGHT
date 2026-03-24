/// Pyth Hermes API helpers — fetch VAA price update data for on-chain submission

const HERMES_URL = process.env.PYTH_HERMES_URL ?? "https://hermes.pyth.network";

/** Pyth price feed IDs per asset (matches contract get_price_feed_id) */
const PRICE_FEED_IDS: Record<number, string> = {
  0: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // BTC
  1: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH
  2: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL
  3: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB
  4: "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5", // APT
};

export interface PythPriceData {
  /** Price as integer (Pyth format) */
  price: number;
  /** VAA bytes as Uint8Array — ready for on-chain pyth::update_price_feeds */
  vaaBytes: Uint8Array[];
}

/**
 * Fetch latest Pyth price update for an asset.
 * Returns both the parsed price and the binary VAA needed for on-chain submission.
 */
export async function fetchPythVaa(asset: number): Promise<PythPriceData> {
  const feedId = PRICE_FEED_IDS[asset];
  if (!feedId) throw new Error(`Unknown asset: ${asset}`);

  const resp = await fetch(
    `${HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!resp.ok) throw new Error(`Pyth API error: ${resp.status}`);

  const data = await resp.json() as {
    parsed?: Array<{ price?: { price: string } }>;
    binary?: { data?: string[] };
  };
  const parsed = data.parsed?.[0]?.price;
  if (!parsed) throw new Error("No price data from Pyth");

  const price = Math.abs(Number(parsed.price));

  // Extract binary VAA data — each element is a hex-encoded VAA
  const binaryData: string[] = data.binary?.data ?? [];
  const vaaBytes = binaryData.map((hexStr: string) => {
    // Hermes returns hex-encoded binary when encoding=hex
    const clean = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  });

  return { price, vaaBytes };
}
