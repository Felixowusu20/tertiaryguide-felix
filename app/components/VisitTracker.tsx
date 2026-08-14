"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "tg_visitor_id";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(VISITOR_ID_KEY, id);
  return id;
}

function shouldTrackPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/ventra-superadmin-login")) return false;
  if (pathname.startsWith("/dashboard")) return false;
  return true;
}

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) return;

    let cancelled = false;

    async function track() {
      try {
        const visitorId = getOrCreateVisitorId();
        if (!visitorId) return;

        await fetch("/api/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ path: pathname, visitorId }),
        });
      } catch {
        if (cancelled) return;
      }
    }

    track();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
