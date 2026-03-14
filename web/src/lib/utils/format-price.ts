/// Price formatting utilities

/** Format octas (10^8) to APT with up to 2 decimals */
export function formatApt(octas: number): string {
  const apt = octas / 1e8;
  return apt < 1 ? apt.toFixed(2) : apt.toFixed(1);
}

/** Format USD price (Pyth format: price * 10^8) */
export function formatUsdPrice(pythPrice: number): string {
  const usd = pythPrice / 1e8;
  if (usd >= 1000) return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

/** Truncate wallet address: 0x1234...abcd */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
