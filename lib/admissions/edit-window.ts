import { isDeadlineCalendarExpired } from "../deadlines";

export const EDITABLE_APPLICATION_STATUSES = [
  "Pending",
  "Under Review",
] as const;

export function isApplicationEditable(status: string): boolean {
  return (EDITABLE_APPLICATION_STATUSES as readonly string[]).includes(status);
}

export function deadlineToIso(
  deadline: Date | string | null | undefined,
): string | null {
  if (!deadline) return null;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Students may edit only while the school deadline is still open and the application is not locked by status. */
export function canStudentEditApplication(
  status: string | null | undefined,
  deadline: Date | string | null | undefined,
): boolean {
  if (isDeadlineCalendarExpired(deadlineToIso(deadline))) return false;
  if (!status) return true;
  return isApplicationEditable(status);
}
