"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X, ZoomIn } from "lucide-react";
import { ResponsiveMediaImg } from "@/app/components/ResponsiveMediaImg";
import { IMAGE_SIZES, SRCSET_WIDTHS } from "@/lib/cloudinary-image";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function FlyerLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  const clampScale = useCallback(
    (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)),
    [],
  );

  const setZoom = useCallback(
    (next: number) => {
      const clamped = clampScale(next);
      setScale(clamped);
      if (clamped <= MIN_SCALE) {
        setTx(0);
        setTy(0);
      }
    },
    [clampScale],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom(scale + ZOOM_STEP);
      if (e.key === "-" || e.key === "_") setZoom(scale - ZOOM_STEP);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, scale, setZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;

    if (pointers.current.size === 1) {
      panLast.current = { x: e.clientX, y: e.clientY };
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: pointerDistance(a, b), scale };
      panLast.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = pointerDistance(a, b);
      if (pinchStart.current.dist > 0) {
        setZoom((dist / pinchStart.current.dist) * pinchStart.current.scale);
      }
      moved.current = true;
      return;
    }

    if (scale > 1 && panLast.current && pointers.current.size === 1) {
      const dx = e.clientX - panLast.current.x;
      const dy = e.clientY - panLast.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      panLast.current = { x: e.clientX, y: e.clientY };
      setTx((prev) => prev + dx);
      setTy((prev) => prev + dy);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panLast.current = null;
  };

  const onDoubleToggle = () => {
    if (scale > 1) setZoom(1);
    else setZoom(2.25);
  };

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (moved.current) return;
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — full size flyer`}
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-md"
      onClick={onBackdropClick}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <p className="min-w-0 truncate text-sm font-medium text-white/90">
          {alt}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom(scale - ZOOM_STEP)}
            disabled={scale <= MIN_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-35"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-white/80">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(scale + ZOOM_STEP)}
            disabled={scale >= MAX_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-35"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20"
            aria-label="Close flyer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          if (moved.current || scale > 1) return;
          onClose();
        }}
      >
        <ResponsiveMediaImg
          src={src}
          alt={alt}
          sizes={IMAGE_SIZES.lightbox}
          widths={SRCSET_WIDTHS.lightbox}
          widthHint={1600}
          loading="eager"
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-[min(92dvh,100%)] max-w-[min(96vw,100%)] touch-none select-none object-contain"
          style={{
            transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
            transformOrigin: "center center",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            const wasMoved = moved.current;
            endPointer(e);
            const now = Date.now();
            if (!wasMoved && pointers.current.size === 0) {
              if (now - lastTap.current < 300) {
                onDoubleToggle();
                lastTap.current = 0;
              } else {
                lastTap.current = now;
              }
            }
          }}
          onPointerCancel={endPointer}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP / 2 : ZOOM_STEP / 2;
            setZoom(scale + delta);
          }}
        />
      </div>

      <p className="shrink-0 px-4 pb-4 text-center text-[11px] text-white/55 sm:text-xs">
        <ZoomIn className="mr-1 inline h-3 w-3" aria-hidden />
        Pinch, scroll, or use + / − · double-tap to zoom · tap outside or Esc to
        close
      </p>
    </div>,
    document.body,
  );
}
