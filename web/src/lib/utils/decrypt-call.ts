/// Client-side AES-256-GCM decryption of sealed call data

/** Convert hex string to Uint8Array */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Decrypt an encrypted call blob using the provided AES key and IV */
export async function decryptCall(
  encryptedBlob: string,
  key: string,
  iv: string,
): Promise<{ asset: number; direction: boolean; target_price: number }> {
  const keyBytes = fromHex(key);
  const ivBytes = fromHex(iv);
  const cipherBytes = fromHex(encryptedBlob);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer },
    cryptoKey,
    cipherBytes.buffer as ArrayBuffer,
  );

  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}
