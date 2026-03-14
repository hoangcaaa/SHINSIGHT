/// AES-256-GCM encryption utilities for sealing call data
/// Uses Web Crypto API (available in Deno runtime)

/** Encrypt plaintext call data, returns ciphertext + key + iv as hex strings */
export async function encryptCallData(plaintext: string): Promise<{
  ciphertext: string;
  key: string;
  iv: string;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random AES-256 key
  const cryptoKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );

  // Export key as raw bytes
  const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);

  return {
    ciphertext: toHex(new Uint8Array(encrypted)),
    key: toHex(new Uint8Array(rawKey)),
    iv: toHex(iv),
  };
}

/** Compute SHA3-256 hash of data (hex string output) */
export async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return toHex(new Uint8Array(hashBuffer));
}

/** Convert Uint8Array to hex string */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
