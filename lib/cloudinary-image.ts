import type { ImageLoaderProps } from "next/image";

const CLOUDINARY_HOST = "res.cloudinary.com";
const IMAGE_UPLOAD = "/image/upload/";

const TRANSFORM_SEGMENT = /^(c_|w_|h_|f_|q_|g_|e_|fl_|b_|ar_|dpr_|if_|t_|a_|o_|r_|x_|y_|z_|u_|l_|bo_|co_|cs_|dn_|dl_|du_|eo_|so_|ac_|vc_|br_|af_|pg_)/;

export const IMAGE_SIZES = {
  blogCard: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  blogList: "(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px",
  blogHero: "(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px",
  thumb: "96px",
  explore: "(max-width: 640px) 100vw, 560px",
  exploreCompact: "(max-width: 640px) 50vw, 280px",
  lightbox: "100vw",
} as const;

export const SRCSET_WIDTHS = {
  feed: [360, 480, 640, 800, 1080],
  content: [400, 640, 800, 1080, 1280, 1600],
  thumb: [96, 192, 256],
  lightbox: [800, 1080, 1440, 1920],
} as const;

/** Pre-generate common delivery sizes on upload so first views stay fast. */
export const CLOUDINARY_EAGER_TRANSFORMS = [
  "c_limit,w_400/f_auto/q_auto",
  "c_limit,w_800/f_auto/q_auto",
  "c_limit,w_1200/f_auto/q_auto",
  "c_limit,w_1600/f_auto/q_auto",
].join("|");

export function isCloudinaryImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === CLOUDINARY_HOST &&
      parsed.pathname.includes(IMAGE_UPLOAD)
    );
  } catch {
    return url.includes(CLOUDINARY_HOST) && url.includes(IMAGE_UPLOAD);
  }
}

function isTransformSegment(part: string): boolean {
  if (!part) return false;
  if (part.includes(",")) return true;
  return TRANSFORM_SEGMENT.test(part);
}

function splitCloudinaryImageUrl(url: string): {
  prefix: string;
  assetPath: string;
} | null {
  const index = url.indexOf(IMAGE_UPLOAD);
  if (index === -1) return null;

  const prefix = url.slice(0, index + IMAGE_UPLOAD.length);
  const rest = url.slice(index + IMAGE_UPLOAD.length);
  if (!rest) return null;

  const parts = rest.split("/");
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));

  if (versionIndex === 0) {
    return { prefix, assetPath: rest };
  }
  if (versionIndex > 0) {
    return { prefix, assetPath: parts.slice(versionIndex).join("/") };
  }

  let idx = 0;
  while (idx < parts.length - 1 && isTransformSegment(parts[idx])) {
    idx += 1;
  }
  return { prefix, assetPath: parts.slice(idx).join("/") };
}

function qualityTransform(quality?: number | string): string {
  if (typeof quality === "number") {
    if (quality >= 90) return "q_auto:best";
    if (quality <= 50) return "q_auto:eco";
    return "q_auto";
  }
  if (quality === "auto:best" || quality === "auto:eco" || quality === "auto:good") {
    return `q_${quality}`;
  }
  return "q_auto";
}

export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    crop?: "limit" | "fill" | "fit";
    quality?: number | string;
    format?: "auto" | "jpg" | "png";
  } = {},
): string {
  if (!isCloudinaryImageUrl(url)) return url;

  const split = splitCloudinaryImageUrl(url);
  if (!split) return url;

  const crop = options.crop ?? "limit";
  const parts: string[] = [];

  if (options.width || options.height) {
    const dim = [
      crop !== "limit" ? `c_${crop}` : "c_limit",
      options.width ? `w_${Math.round(options.width)}` : "",
      options.height ? `h_${Math.round(options.height)}` : "",
    ]
      .filter(Boolean)
      .join(",");
    parts.push(dim);
  }

  const format = options.format ?? "auto";
  parts.push(format === "auto" ? "f_auto" : `f_${format}`);
  parts.push(qualityTransform(options.quality));

  return `${split.prefix}${parts.join("/")}/${split.assetPath}`;
}

export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  return optimizeCloudinaryUrl(src, { width, quality });
}

export function cloudinarySrcSet(
  url: string,
  widths: readonly number[] = SRCSET_WIDTHS.content,
): string | undefined {
  if (!isCloudinaryImageUrl(url)) return undefined;
  return widths
    .map((width) => `${optimizeCloudinaryUrl(url, { width })} ${width}w`)
    .join(", ");
}

export function imageAlt(
  text: string | null | undefined,
  fallback: string,
): string {
  const plain = (text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return fallback;
  return plain.length > 120 ? `${plain.slice(0, 117)}…` : plain;
}

export function ogImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!isCloudinaryImageUrl(url)) return url;
  // Crawlers are happiest with JPEG; cap width without cropping the flyer.
  return optimizeCloudinaryUrl(url, {
    width: 1200,
    format: "jpg",
    quality: "auto:good",
  });
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function readAttr(attrs: string, name: string): string | null {
  const match = attrs.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function writeAttr(attrs: string, name: string, value: string): string {
  const assignment = ` ${name}="${escapeAttr(value)}"`;
  const re = new RegExp(
    `\\s*\\b${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
    "i",
  );
  if (re.test(attrs)) return attrs.replace(re, assignment);
  return `${attrs.trimEnd()}${assignment} `;
}

/**
 * Rewrite <img> tags in stored HTML so Cloudinary assets get responsive
 * srcset, modern formats, lazy loading, and a usable alt.
 */
export function rewriteHtmlImages(
  html: string,
  options: { fallbackAlt?: string } = {},
): string {
  if (!html) return html;
  const fallbackAlt = options.fallbackAlt || "Blog image";

  return html.replace(/<img\b([^>]*?)(\/?)>/gi, (full, rawAttrs: string, closing: string) => {
    const src = readAttr(rawAttrs, "src");
    if (!src || !isCloudinaryImageUrl(src)) {
      let attrs = rawAttrs;
      if (!readAttr(attrs, "loading")) attrs = writeAttr(attrs, "loading", "lazy");
      if (!readAttr(attrs, "decoding")) attrs = writeAttr(attrs, "decoding", "async");
      const alt = readAttr(attrs, "alt");
      if (!alt) attrs = writeAttr(attrs, "alt", fallbackAlt);
      return `<img${attrs}${closing}>`;
    }

    let attrs = rawAttrs;
    attrs = writeAttr(attrs, "src", optimizeCloudinaryUrl(src, { width: 800 }));
    const srcset = cloudinarySrcSet(src, SRCSET_WIDTHS.content);
    if (srcset) attrs = writeAttr(attrs, "srcset", srcset);
    attrs = writeAttr(attrs, "sizes", IMAGE_SIZES.blogList);
    attrs = writeAttr(attrs, "loading", "lazy");
    attrs = writeAttr(attrs, "decoding", "async");

    const alt = readAttr(attrs, "alt")?.trim();
    if (!alt) attrs = writeAttr(attrs, "alt", fallbackAlt);

    return `<img${attrs}${closing}>`;
  });
}
