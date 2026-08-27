/** Start of the given instant’s calendar day in the local timezone. */
export function localDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * True when the application deadline is no longer “current”: the first full
 * calendar day after the deadline (midnight that night → next morning).
 * On the deadline day itself (all day) this is false, so a deadline of “today”
 * is still open until the next day.
 */
export function isDeadlineCalendarExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const t = new Date(deadline);
  if (Number.isNaN(t.getTime())) return false;
  const deadlineDay = localDayStart(t);
  const today = localDayStart(new Date());
  return deadlineDay.getTime() < today.getTime();
}

/** Active deadlines first (soonest first); expired dates last, still by date. */
export function compareDeadlineForListing(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const aExpired = isDeadlineCalendarExpired(a ?? null);
  const bExpired = isDeadlineCalendarExpired(b ?? null);
  if (aExpired !== bExpired) return aExpired ? 1 : -1;
  const aTime = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);
  if (aValid !== bValid) return aValid ? -1 : 1;
  if (aTime !== bTime) return aTime - bTime;
  return 0;
}

/**
 * True if the deadline falls on a calendar day from `today` through `today + maxDays` (inclusive both ends).
 * Deadlines in the past (before today) are excluded.
 */
export function isInApproachingWindow(
  deadline: string | null,
  maxDays: number = 30,
): boolean {
  if (!deadline) return false;
  const raw = new Date(deadline);
  if (Number.isNaN(raw.getTime())) return false;
  const deadlineDay = localDayStart(raw);
  const today = localDayStart(new Date());
  if (deadlineDay.getTime() < today.getTime()) return false;
  const last = new Date(today);
  last.setDate(last.getDate() + maxDays);
  return deadlineDay.getTime() <= last.getTime();
}
