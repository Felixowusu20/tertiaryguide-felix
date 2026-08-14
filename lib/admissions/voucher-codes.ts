import { randomBytes } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Generate a human-readable voucher code, e.g. HS-8K7D-29PX
 * Prefers a 2–4 char prefix from the school slug/alias.
 */
export function generateVoucherCode(prefixHint?: string | null): string {
  const raw = (prefixHint ?? "TG")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);
  const prefix = raw.length >= 2 ? raw : "TG";
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`;
}

/**
 * Generate a serial like TG-2026-001234
 */
export function generateSerialNumber(sequence: number, year = new Date().getFullYear()): string {
  const padded = String(Math.max(0, sequence)).padStart(6, "0");
  return `TG-${year}-${padded}`;
}
