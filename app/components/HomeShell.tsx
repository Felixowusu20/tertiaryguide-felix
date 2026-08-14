"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Home } from "lucide-react";
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
    `relative inline-flex h-12 items-center justify-center gap-1.5 px-5 text-sm font-semibold transition sm:text-[15px] ${
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
          {/* Mobile: Home + Explore for swipe/tap */}
          <button
            type="button"
            onClick={showHome}
            aria-pressed={view === "home"}
            className={`${tabClass(view === "home")} md:hidden`}
          >
            <Home
              className={`h-4 w-4 ${view === "home" ? "text-[#007AFF]" : ""}`}
            />
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
            <Compass
              className={`h-4 w-4 ${
                view === "explore" ? "text-[#007AFF]" : ""
              }`}
            />
            Explore
            {view === "explore" && (
              <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-[#007AFF]" />
            )}
          </button>
        </div>
      </div>

      {view === "home" ? (
        <div className="animate-in fade-in duration-200">{homeContent}</div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="bg-gradient-to-b from-[#F4F8FF] via-white to-white py-4 sm:py-6">
            <ExploreFeed embedded />
          </div>
        </div>
      )}
    </div>
  );
}
