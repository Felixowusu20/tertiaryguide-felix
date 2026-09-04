import { OptimizedImage } from "@/app/components/OptimizedImage";
import { IMAGE_SIZES } from "@/lib/cloudinary-image";

type BlogPostImageVariant = "list" | "card" | "hero" | "thumb";

export function BlogPostImage({
  src,
  alt,
  sizes,
  priority = false,
  variant = "list",
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  variant?: BlogPostImageVariant;
}) {
  if (variant === "thumb") {
    return (
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-gray-900/5">
        <OptimizedImage
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? IMAGE_SIZES.thumb}
          className="object-contain object-center"
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-[#F3F4F6]">
      <OptimizedImage
        src={src}
        alt={alt}
        width={1200}
        height={800}
        sizes={
          sizes ??
          (variant === "hero"
            ? IMAGE_SIZES.blogHero
            : variant === "card"
              ? IMAGE_SIZES.blogCard
              : IMAGE_SIZES.blogList)
        }
        priority={priority}
        className="block h-auto w-full object-contain object-center"
      />
    </div>
  );
}
