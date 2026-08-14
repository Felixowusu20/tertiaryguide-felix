/**
 * Ad video sources: direct file URLs (e.g. Cloudinary) or a YouTube watch/shorts/embed link.
 * Embeds use the standard YouTube player — no YouTube Data API key required.
 */

export function extractYouTubeVideoId(input: string | undefined | null): string | null {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  const tryPatterns: RegExp[] = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i,
    /[?&]v=([a-zA-Z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const re of tryPatterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Muted in-view preview: autoplay + loop (playlist= id is required for loop on YouTube). */
export function youtubePreviewEmbedUrl(videoId: string): string {
  const q = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    modestbranding: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${q.toString()}`;
}

/** Full player after user opens modal (click counts as engagement for unmute in many cases). */
export function youtubeModalEmbedUrl(videoId: string): string {
  const q = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${q.toString()}`;
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/**
 * Ad rows always need a non-empty `imageUrl` in the DB (poster + non-video carousel fallback).
 * If the user only provides a video, we derive: YouTube → official thumbnail, else → a site asset.
 */
const DEFAULT_VIDEO_ONLY_POSTER = "/og-image.jpg";

export function resolveStoredAdImageUrl(
  imageInput: string | undefined | null,
  videoInput: string | undefined | null,
): string {
  const i = (imageInput ?? "").trim();
  if (i) return i;
  const v = (videoInput ?? "").trim();
  if (!v) return "";
  const yid = extractYouTubeVideoId(v);
  if (yid) {
    return `https://i.ytimg.com/vi/${yid}/hqdefault.jpg`;
  }
  return DEFAULT_VIDEO_ONLY_POSTER;
}
