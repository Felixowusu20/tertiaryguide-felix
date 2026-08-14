/**
 * Canonical site origin for metadata, OG tags, JSON-LD, sitemap, and share URLs.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://tertiaryguide-mu.vercel.app).
 */
export function getSiteUrl(): string {
  const trim = (u: string) => u.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return trim(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return trim(process.env.NEXT_PUBLIC_BASE_URL);
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  return "https://tertiaryguide.com";
}

export function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${path}`;
}
