"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreFeed } from "./ExploreFeed";

type View = "home" | "explore";

function notifyHomeTab(view: View) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tg-home-tab", { detail: view }));
}

function isDesktopWidth() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
  );
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [data-no-page-swipe]")) {
    return true;
  }
  let node: Element | null = target;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" || overflowX === "scroll") &&
      node.scrollWidth > node.clientWidth + 8
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function HomeShell({ homeContent }: { homeContent: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialExplore = searchParams.get("tab") === "explore";
  const [index, setIndex] = useState(initialExplore ? 1 : 0);

  const indexRef = useRef(index);
  const trackRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const homePaneRef = useRef<HTMLDivElement>(null);
  const explorePaneRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const dragging = useRef(false);
  const ignoreGesture = useRef(false);
  const suppressClick = useRef(false);
  const pagingRef = useRef(false);

  const [paneHeight, setPaneHeight] = useState<number | undefined>();
  const [heightReady, setHeightReady] = useState(false);

  indexRef.current = index;

  const paneWidth = () => shellRef.current?.clientWidth || window.innerWidth;

  const measurePanes = useCallback(() => {
    if (isDesktopWidth()) {
      setPaneHeight(undefined);
      return;
    }
    const homeH = homePaneRef.current?.offsetHeight ?? 0;
    const exploreH = explorePaneRef.current?.offsetHeight ?? 0;
    const next =
      pagingRef.current || dragging.current
        ? Math.max(homeH, exploreH)
        : indexRef.current === 0
          ? homeH
          : exploreH;
    if (next > 0) {
      setPaneHeight(next);
      setHeightReady(true);
    }
  }, []);

  const applyUnderline = (nextProgress: number, animate = false) => {
    const el = underlineRef.current;
    if (!el) return;
    el.style.transition = animate
      ? "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    el.style.transform = `translateX(${nextProgress * 100}%)`;
  };

  const applyTrack = useCallback(
    (nextIndex: number, dragPx: number, animate: boolean) => {
      const el = trackRef.current;
      if (!el) return;
      if (isDesktopWidth()) {
        el.style.transform = "";
        el.style.transition = "";
        return;
      }
      el.style.transition = animate
        ? "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)"
        : "none";
      el.style.transform = `translate3d(calc(${-nextIndex * 50}% + ${dragPx}px), 0, 0)`;
    },
    [],
  );

  const commitIndex = useCallback(
    (next: number) => {
      const clamped = next < 0 ? 0 : next > 1 ? 1 : next;
      indexRef.current = clamped;
      setIndex(clamped);
      applyUnderline(clamped, true);
      applyTrack(clamped, 0, true);
      const view: View = clamped === 1 ? "explore" : "home";
      notifyHomeTab(view);
      router.replace(clamped === 1 ? "/?tab=explore" : "/", { scroll: false });
    },
    [applyTrack, router],
  );

  useEffect(() => {
    const next = searchParams.get("tab") === "explore" ? 1 : 0;
    if (next === indexRef.current) return;
    indexRef.current = next;
    setIndex(next);
    applyUnderline(next);
    applyTrack(next, 0, false);
    notifyHomeTab(next === 1 ? "explore" : "home");
  }, [applyTrack, searchParams]);

  useLayoutEffect(() => {
    applyTrack(indexRef.current, 0, false);
    applyUnderline(indexRef.current);
    measurePanes();
  }, [applyTrack, measurePanes, index]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      applyTrack(indexRef.current, 0, false);
      measurePanes();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [applyTrack, measurePanes]);

  useEffect(() => {
    const home = homePaneRef.current;
    const explore = explorePaneRef.current;
    if (!home && !explore) return;
    const ro = new ResizeObserver(() => measurePanes());
    if (home) ro.observe(home);
    if (explore) ro.observe(explore);
    return () => ro.disconnect();
  }, [measurePanes]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const onStart = (e: TouchEvent) => {
      if (isDesktopWidth() || e.touches.length !== 1) return;
      ignoreGesture.current = shouldIgnoreSwipeTarget(e.target);
      if (ignoreGesture.current) return;
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      lastX.current = t.clientX;
      lastT.current = e.timeStamp;
      axis.current = "undecided";
      dragging.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (ignoreGesture.current || isDesktopWidth() || e.touches.length !== 1) {
        return;
      }
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (axis.current === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis.current = Math.abs(dx) > Math.abs(dy) * 1.05 ? "x" : "y";
        if (axis.current === "x") {
          dragging.current = true;
          pagingRef.current = true;
          applyTrack(indexRef.current, 0, false);
          measurePanes();
        }
      }

      lastX.current = t.clientX;
      lastT.current = e.timeStamp;

      if (axis.current !== "x") return;
      e.preventDefault();

      const width = paneWidth();
      let drag = dx;
      const atHome = indexRef.current === 0;
      const atExplore = indexRef.current === 1;
      if (atHome && drag > 0) drag *= 0.18;
      if (atExplore && drag < 0) drag *= 0.18;
      drag = Math.max(-width, Math.min(width, drag));
      applyTrack(indexRef.current, drag, false);
      applyUnderline(
        Math.max(0, Math.min(1, indexRef.current - drag / width)),
      );
    };

    const onEnd = (e: TouchEvent) => {
      if (ignoreGesture.current || isDesktopWidth()) {
        ignoreGesture.current = false;
        return;
      }
      if (axis.current !== "x" || !dragging.current) {
        axis.current = "undecided";
        dragging.current = false;
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const flick =
        (t.clientX - lastX.current) /
        Math.max(8, e.timeStamp - lastT.current);
      const width = paneWidth();
      const distance = Math.abs(dx);
      const goNext =
        (dx < 0 && (distance > width * 0.15 || flick < -0.55)) ||
        (dx > 0 && (distance > width * 0.15 || flick > 0.55));

      let next = indexRef.current;
      if (goNext) {
        if (dx < 0) next = 1;
        if (dx > 0) next = 0;
      }
      if (distance > 10) suppressClick.current = true;
      dragging.current = false;
      pagingRef.current = false;
      axis.current = "undecided";
      if (next !== indexRef.current) {
        window.scrollTo(0, 0);
      }
      commitIndex(next);
      window.setTimeout(measurePanes, 40);
    };

    shell.addEventListener("touchstart", onStart, { passive: true });
    shell.addEventListener("touchmove", onMove, { passive: false });
    shell.addEventListener("touchend", onEnd);
    shell.addEventListener("touchcancel", onEnd);
    return () => {
      shell.removeEventListener("touchstart", onStart);
      shell.removeEventListener("touchmove", onMove);
      shell.removeEventListener("touchend", onEnd);
      shell.removeEventListener("touchcancel", onEnd);
    };
  }, [applyTrack, commitIndex, measurePanes]);

  const showHome = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (indexRef.current !== 0) window.scrollTo(0, 0);
    commitIndex(0);
  };
  const showExplore = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (indexRef.current !== 1) window.scrollTo(0, 0);
    commitIndex(1);
  };

  return (
    <div ref={shellRef} className="min-w-0">
      <div className="sticky top-14 z-30 border-b border-[#E8E8E8] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 md:hidden">
        <div className="relative mx-auto grid h-12 max-w-xs grid-cols-2 px-2">
          <button
            type="button"
            onClick={showHome}
            aria-pressed={index === 0}
            className={`relative text-sm font-semibold transition ${
              index === 0 ? "text-[#1E1E1E]" : "text-[#6B7280]"
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={showExplore}
            aria-pressed={index === 1}
            className={`relative text-sm font-semibold transition ${
              index === 1 ? "text-[#1E1E1E]" : "text-[#6B7280]"
            }`}
          >
            Explore
          </button>
          <span
            ref={underlineRef}
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-1 w-1/2 rounded-full bg-[#007AFF]"
            style={{ transform: `translateX(${index * 100}%)` }}
          />
        </div>
      </div>

      <div
        className="overflow-hidden md:!h-auto md:overflow-visible"
        style={{
          height: paneHeight,
          transition: heightReady
            ? "height 380ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
        }}
      >
        <div
          ref={trackRef}
          className="flex w-[200%] items-start will-change-transform md:block md:w-full md:!transform-none"
        >
          <div ref={homePaneRef} className="w-1/2 shrink-0 md:w-full">
            {homeContent}
          </div>
          <div ref={explorePaneRef} className="w-1/2 shrink-0 md:hidden">
            <ExploreFeed embedded variant="tab" />
          </div>
        </div>
      </div>
    </div>
  );
}
