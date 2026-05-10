import { WordStat } from "../types";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function bytesToBase32(bytes: Uint8Array) {
  let output = "";
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32ToBytes(input: string) {
  const normalizedInput = input.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalizedInput) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 secret.");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

function leftPadCode(code: number) {
  return code.toString().padStart(TOTP_DIGITS, "0");
}

async function hmacSha1(secret: Uint8Array, counter: bigint) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, counter);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
}

async function generateTotpForCounter(secret: string, counter: bigint) {
  const hmac = await hmacSha1(base32ToBytes(secret), counter);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return leftPadCode(binary % 10 ** TOTP_DIGITS);
}

export function generateTotpSecret(byteLength = 20) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase32(bytes);
}

export function buildOtpAuthUri({
  issuer,
  accountName,
  secret,
}: {
  issuer: string;
  accountName: string;
  secret: string;
}) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: TOTP_DIGITS.toString(),
    period: TOTP_TIME_STEP_SECONDS.toString(),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

export async function verifyTotpCode(
  secret: string,
  code: string,
  windowSize = 1,
) {
  const normalizedCode = code.trim();
  const nowCounter = BigInt(
    Math.floor(Date.now() / 1000 / TOTP_TIME_STEP_SECONDS),
  );

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const expectedCode = await generateTotpForCounter(
      secret,
      nowCounter + BigInt(offset),
    );
    if (expectedCode === normalizedCode) {
      return true;
    }
  }

  return false;
}
