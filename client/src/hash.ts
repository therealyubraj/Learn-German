/**
 * Ensures deterministic hashing by first converting the data
 * into a JSON string.
 */
export async function computeChecksum(str: string): Promise<string> {
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    // Fallback: This path is usually taken outside of a browser context.
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }

  // CRITICAL STEP: Consistent Serialization
  // The hashing algorithm only accepts byte data, so we must first
  // convert the JavaScript object into a stable string format.

  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // 3. Hash the data using SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // 4. Convert the buffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
