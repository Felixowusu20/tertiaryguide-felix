import type { CSSProperties } from "react";

/** Default TertiaryGuide brand blue — used when a school has no custom color. */
export const DEFAULT_BRAND_COLOR = "#007AFF";

export const BRAND_COLOR_PRESETS = [
  "#007AFF",
  "#0F766E",
  "#166534",
  "#B45309",
  "#B91C1C",
  "#7C3AED",
  "#0369A1",
  "#BE185D",
  "#1E3A5F",
  "#374151",
] as const;

export const MAX_BRAND_COLORS = 4;

export function normalizeBrandColor(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_BRAND_COLOR;
  let value = input.trim();
  if (!value) return DEFAULT_BRAND_COLOR;

  if (!value.startsWith("#")) value = `#${value}`;

  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    value = `#${r}${r}${g}${g}${b}${b}`;
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return DEFAULT_BRAND_COLOR;
  return value.toUpperCase();
}

/**
 * Normalize 1–4 brand colors. Accepts a single color, an array, or null.
 * Always returns at least one color.
 */
export function normalizeBrandColors(
  input?: string | string[] | null,
  fallback?: string | null,
): string[] {
  const fromArray = Array.isArray(input)
    ? input
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .slice(0, MAX_BRAND_COLORS)
        .map((c) => normalizeBrandColor(c))
    : typeof input === "string" && input.trim()
      ? [normalizeBrandColor(input)]
      : [];

  if (fromArray.length > 0) {
    // de-dupe while preserving order
    return [...new Set(fromArray)];
  }

  if (typeof fallback === "string" && fallback.trim()) {
    return [normalizeBrandColor(fallback)];
  }

  return [DEFAULT_BRAND_COLOR];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeBrandColor(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Average-blend multiple hex colors into one solid accent. */
export function blendBrandColors(colors: string[]): string {
  const list = normalizeBrandColors(colors);
  if (list.length === 1) return list[0];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const hex of list) {
    const rgb = hexToRgb(hex);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  }
  const n = list.length;
  return rgbToHex(r / n, g / n, b / n);
}

export function brandGradient(colors: string[], angle = 135): string {
  const list = normalizeBrandColors(colors);
  if (list.length === 1) {
    return `linear-gradient(${angle}deg, ${list[0]}, ${mixBrandWithWhite(list[0], 0.35)})`;
  }
  const stops = list
    .map((color, index) => {
      const pct = Math.round((index / (list.length - 1)) * 100);
      return `${color} ${pct}%`;
    })
    .join(", ");
  return `linear-gradient(${angle}deg, ${stops})`;
}

/** Mix brand toward white (amount 0–1). Higher = lighter. */
export function mixBrandWithWhite(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    r + (255 - r) * t,
    g + (255 - g) * t,
    b + (255 - b) * t,
  );
}

/** Darken brand for hover states. */
export function darkenBrand(hex: string, amount = 0.12): string {
  const { r, g, b } = hexToRgb(hex);
  const t = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * t, g * t, b * t);
}

export type BrandThemeVars = CSSProperties & {
  ["--school-brand"]?: string;
  ["--school-brand-hover"]?: string;
  ["--school-brand-soft"]?: string;
  ["--school-brand-border"]?: string;
  ["--school-brand-muted"]?: string;
  ["--school-brand-2"]?: string;
  ["--school-brand-3"]?: string;
  ["--school-brand-4"]?: string;
  ["--school-brand-gradient"]?: string;
};

export type BrandThemeInput =
  | string
  | string[]
  | null
  | undefined
  | {
      brandColor?: string | null;
      brandColors?: string[] | null;
    };

function resolveBrandColors(input?: BrandThemeInput): string[] {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return normalizeBrandColors(input.brandColors, input.brandColor);
  }
  return normalizeBrandColors(input as string | string[] | null | undefined);
}

export function brandThemeStyle(input?: BrandThemeInput): BrandThemeVars {
  const colors = resolveBrandColors(input);
  const brand = blendBrandColors(colors);
  return {
    ["--school-brand"]: brand,
    ["--school-brand-hover"]: darkenBrand(brand, 0.14),
    ["--school-brand-soft"]: mixBrandWithWhite(brand, 0.9),
    ["--school-brand-border"]: mixBrandWithWhite(brand, 0.78),
    ["--school-brand-muted"]: mixBrandWithWhite(brand, 0.55),
    ["--school-brand-2"]: colors[1] || brand,
    ["--school-brand-3"]: colors[2] || colors[1] || brand,
    ["--school-brand-4"]: colors[3] || colors[2] || colors[1] || brand,
    ["--school-brand-gradient"]: brandGradient(colors),
  };
}

/** Status / chart palette derived from the school brand. */
export function brandChartColors(brandInput?: BrandThemeInput): string[] {
  const colors = resolveBrandColors(brandInput);
  const brand = blendBrandColors(colors);
  return [
    ...colors,
    darkenBrand(brand, 0.2),
    mixBrandWithWhite(brand, 0.35),
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
  ];
}

export function formatSchoolDeadline(
  deadline: string | null | undefined,
): string {
  if (!deadline) return "—";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(
  deadline: string | null | undefined,
): string {
  if (!deadline) return "";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
