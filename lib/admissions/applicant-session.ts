/** Client-side persistence for in-progress partner school applications. */

export const APPLY_SESSION_KEY = "tg_apply_session";

export type ApplySession = {
  schoolId: string;
  schoolSlug?: string | null;
  voucherCode: string;
  serialNumber: string;
  email?: string;
  updatedAt: string;
};

export function readApplySession(schoolId?: string): ApplySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APPLY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplySession;
    if (!parsed?.schoolId || !parsed?.voucherCode || !parsed?.serialNumber) {
      return null;
    }
    if (schoolId && parsed.schoolId !== schoolId) return null;
    return {
      ...parsed,
      voucherCode: String(parsed.voucherCode).trim().toUpperCase(),
      serialNumber: String(parsed.serialNumber).trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

export function writeApplySession(
  session: Omit<ApplySession, "updatedAt"> & { updatedAt?: string },
): void {
  if (typeof window === "undefined") return;
  const payload: ApplySession = {
    schoolId: session.schoolId,
    schoolSlug: session.schoolSlug ?? null,
    voucherCode: session.voucherCode.trim().toUpperCase(),
    serialNumber: session.serialNumber.trim().toUpperCase(),
    email: session.email,
    updatedAt: session.updatedAt || new Date().toISOString(),
  };
  window.localStorage.setItem(APPLY_SESSION_KEY, JSON.stringify(payload));
}

export function clearApplySession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLY_SESSION_KEY);
}
