import type { ImgHTMLAttributes } from "react";
import {
  IMAGE_SIZES,
  SRCSET_WIDTHS,
  cloudinarySrcSet,
  isCloudinaryImageUrl,
  optimizeCloudinaryUrl,
} from "@/lib/cloudinary-image";

type ResponsiveMediaImgProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "alt"
> & {
  src: string;
  alt: string;
  widths?: readonly number[];
  widthHint?: number;
};

/** Native <img> with Cloudinary srcset — use when the frame must follow the image’s own ratio. */
export function ResponsiveMediaImg({
  src,
  alt,
  className,
  sizes = IMAGE_SIZES.explore,
  widths = SRCSET_WIDTHS.feed,
  widthHint = 800,
  loading = "lazy",
  ...rest
}: ResponsiveMediaImgProps) {
  const optimized = isCloudinaryImageUrl(src)
    ? optimizeCloudinaryUrl(src, { width: widthHint })
    : src;
  const srcSet = cloudinarySrcSet(src, widths);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}
