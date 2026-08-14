import crypto from "crypto";

export const ADMIN_OTP_TTL_SECONDS = 10 * 60;
export const ADMIN_MIN_PASSWORD = 8;

export function generateAdminOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashAdminOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "***@***";

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }

  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export function maskUsername(username: string): string {
  const normalized = username.trim();
  if (!normalized) return "***";
  if (normalized.length <= 2) {
    return `${normalized[0] ?? "*"}***`;
  }
  if (normalized.length <= 4) {
    return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
  }
  return `${normalized.slice(0, 2)}${"*".repeat(
    Math.max(3, normalized.length - 3),
  )}${normalized.slice(-1)}`;
}
