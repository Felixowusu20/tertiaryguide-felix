/**
 * Convert a school name into a URL-safe slug.
 * "Holy Spirit College" → "holyspirit"
 */
export function slugifySchoolName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^[0-9]+/, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(slug) || /^[a-z0-9]{2,48}$/.test(slug);
}

const RESERVED_SLUGS = new Set([
  "signin",
  "signup",
  "setup",
  "recover",
  "admin",
  "api",
  "apply",
  "school",
  "portal",
  "new",
  "edit",
  "settings",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function normalizeSlug(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) && trimmed.length >= 2) {
    return trimmed.slice(0, 48);
  }
  return slugifySchoolName(trimmed);
}
