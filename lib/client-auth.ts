/** Soft client auth helpers (matches existing `tg_user_email` pattern). */

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const email = window.localStorage.getItem("tg_user_email");
    return email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("tg_user_name")?.trim() || null;
  } catch {
    return null;
  }
}

/** Build a sign-in URL that returns the user to the current or given path. */
export function signInRedirectHref(returnPath?: string): string {
  const path =
    returnPath ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");
  return `/signin?redirect=${encodeURIComponent(path)}`;
}

/**
 * If the user is not signed in, replace to sign-in with redirect back.
 * Returns the email when authenticated, otherwise null (redirect already scheduled).
 */
export function requireClientAuth(
  router: { replace: (href: string) => void },
  returnPath?: string,
): string | null {
  const email = getStoredUserEmail();
  if (email) return email;
  router.replace(signInRedirectHref(returnPath));
  return null;
}
