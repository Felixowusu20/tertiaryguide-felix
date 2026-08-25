export type AppNotificationKind =
  | "voucher"
  | "checker"
  | "news"
  | "application"
  | "general";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
  kind?: AppNotificationKind;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  section?: string;
};

export const USER_NOTIFICATIONS_UPDATED = "tg-notifications-updated";
export const ADMIN_NOTIFICATIONS_UPDATED = "tg-admin-notifications-updated";
export const ADMIN_NOTIFICATIONS_KEY = "tg_admin_notifications";

export function userNotificationsKey(email: string) {
  return `tg_notifications:${email.trim().toLowerCase()}`;
}

export function parseNotificationList<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function readUserNotifications(email: string): AppNotification[] {
  if (typeof window === "undefined") return [];
  return parseNotificationList<AppNotification>(
    window.localStorage.getItem(userNotificationsKey(email)),
  );
}

export function writeUserNotifications(
  email: string,
  items: AppNotification[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    userNotificationsKey(email),
    JSON.stringify(items.slice(0, 80)),
  );
  window.dispatchEvent(new CustomEvent(USER_NOTIFICATIONS_UPDATED));
}

export function resolveNotificationHref(n: AppNotification): string {
  if (n.href) return n.href;
  if (n.kind === "checker") return "/dashboard/my-checkers";
  if (n.kind === "voucher") return "/dashboard/my-forms";
  if (n.kind === "application") return "/dashboard/my-applications";
  if (n.kind === "news") return "/blog";

  const haystack = `${n.id} ${n.title} ${n.body}`.toLowerCase();
  if (haystack.includes("wassce") || haystack.includes("checker")) {
    return "/dashboard/my-checkers";
  }
  if (haystack.includes("application")) {
    return "/dashboard/my-applications";
  }
  if (
    haystack.includes("voucher") ||
    haystack.includes("form") ||
    haystack.includes("queued")
  ) {
    return "/dashboard/my-forms";
  }
  if (
    haystack.includes("news") ||
    haystack.includes("blog") ||
    haystack.includes("announcement")
  ) {
    return "/blog";
  }
  return "/dashboard/notification";
}

export function resolveAdminNotificationSection(n: AdminNotification): string {
  if (
    n.section === "forms" ||
    n.section === "checkers" ||
    n.section === "applications" ||
    n.section === "assistance" ||
    n.section === "formRequests"
  ) {
    return n.section;
  }

  const haystack = `${n.id} ${n.title} ${n.body}`.toLowerCase();
  if (haystack.includes("wassce") || haystack.includes("checker")) {
    return "checkers";
  }
  if (haystack.includes("assistance") || haystack.includes("support")) {
    return "assistance";
  }
  if (haystack.includes("application")) {
    return "applications";
  }
  if (haystack.includes("request")) {
    return "formRequests";
  }
  if (haystack.includes("voucher") || haystack.includes("form")) {
    return "forms";
  }
  return "dashboard";
}

export function unreadCount(items: { read: boolean }[]) {
  return items.filter((n) => !n.read).length;
}
