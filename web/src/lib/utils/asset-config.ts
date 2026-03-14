/// Asset metadata for display — maps contract enum to human-readable info

export interface AssetInfo {
  id: number;
  name: string;
  symbol: string;
  color: string;
}

export const ASSETS: AssetInfo[] = [
  { id: 0, name: "Bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: 1, name: "Ethereum", symbol: "ETH", color: "#627EEA" },
  { id: 2, name: "Solana", symbol: "SOL", color: "#9945FF" },
  { id: 3, name: "BNB", symbol: "BNB", color: "#F0B90B" },
  { id: 4, name: "Aptos", symbol: "APT", color: "#2DD8A3" },
];

export function getAsset(id: number): AssetInfo {
  return ASSETS[id] ?? ASSETS[0];
}
