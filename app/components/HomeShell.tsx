"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreFeed } from "./ExploreFeed";

type View = "home" | "explore";

function notifyHomeTab(view: View) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tg-home-tab", { detail: view }));
}

export function HomeShell({ homeContent }: { homeContent: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(
    searchParams.get("tab") === "explore" ? "explore" : "home",
  );
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const next = searchParams.get("tab") === "explore" ? "explore" : "home";
    setView(next);
    notifyHomeTab(next);
  }, [searchParams]);

  const showExplore = useCallback(() => {
    setView("explore");
    notifyHomeTab("explore");
    router.replace("/?tab=explore", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const showHome = useCallback(() => {
    setView("home");
    notifyHomeTab("home");
    router.replace("/", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    // Swipe between Home / Explore is mobile-only
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < 0 && view === "home") showExplore();
    if (dx > 0 && view === "explore") showHome();
  };

  const tabClass = (active: boolean) =>
    `relative inline-flex h-12 min-w-[6.5rem] items-center justify-center px-6 text-sm font-semibold transition sm:min-w-[7.5rem] sm:text-[15px] ${
      active ? "text-[#1E1E1E]" : "text-[#6B7280] hover:text-[#1E1E1E]"
    }`;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="min-w-0"
    >
      <div className="sticky top-14 z-30 border-b border-[#E8E8E8] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 md:top-16">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-center px-2 sm:px-4 md:px-10">
          <button
            type="button"
            onClick={showHome}
            aria-pressed={view === "home"}
            className={tabClass(view === "home")}
          >
            Home
            {view === "home" && (
              <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-[#007AFF]" />
            )}
          </button>
          <button
            type="button"
            onClick={showExplore}
            aria-pressed={view === "explore"}
            className={tabClass(view === "explore")}
          >
            Explore
            {view === "explore" && (
              <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-[#007AFF]" />
            )}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            view === "home"
              ? "relative translate-x-0"
              : "pointer-events-none invisible absolute inset-x-0 top-0 -translate-x-full"
          }`}
        >
          {homeContent}
        </div>
        <div
          className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            view === "explore"
              ? "relative translate-x-0"
              : "pointer-events-none invisible absolute inset-x-0 top-0 translate-x-full"
          }`}
        >
          <ExploreFeed embedded />
        </div>
      </div>
    </div>
  );
}
