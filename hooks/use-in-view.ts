"use client";

import { useCallback, useEffect, useState } from "react";

type UseInViewOptions = {
  /** Fraction of the element that must be visible (0–1). */
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
};

/**
 * Callback-ref IntersectionObserver. Fires as soon as the node mounts if it
 * is already on screen (tab switch, first paint), not only after a scroll.
 */
export function useInView<T extends Element = HTMLElement>(
  options: UseInViewOptions = {},
) {
  const {
    threshold = 0.2,
    rootMargin = "80px 0px 80px 0px",
    enabled = true,
  } = options;
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!enabled || !node) {
      setInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    const refresh = () => {
      observer.unobserve(node);
      observer.observe(node);
    };
    window.addEventListener("tg-home-tab", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("tg-home-tab", refresh);
      document.removeEventListener("visibilitychange", refresh);
      observer.disconnect();
    };
  }, [node, threshold, rootMargin, enabled]);

  return { ref, inView };
}

let activeVideo: HTMLVideoElement | null = null;

/** Play this video and pause any other in-view autoplay video. */
export function playInViewVideo(video: HTMLVideoElement) {
  if (activeVideo && activeVideo !== video && !activeVideo.paused) {
    activeVideo.pause();
  }
  activeVideo = video;
  return video.play();
}

export function pauseInViewVideo(video: HTMLVideoElement) {
  video.pause();
  if (activeVideo === video) activeVideo = null;
}
