export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const username = window.localStorage.getItem("tg_admin_username");
  return username ? { "x-admin-username": username } : {};
}

export function getAdminRole(): "admin" | "superadmin" | "school_admin" | null {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem("tg_admin_role");
  if (role === "superadmin" || role === "admin" || role === "school_admin") {
    return role;
  }
  return null;
}

export function getSchoolAdminSlug(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("tg_school_slug");
}

export function isSuperadminClient(): boolean {
  return getAdminRole() === "superadmin";
}

export function isSchoolAdminClient(): boolean {
  return getAdminRole() === "school_admin";
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const authHeaders = getAdminAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  return fetch(input, { ...init, headers });
}
