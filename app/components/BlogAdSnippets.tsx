"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { PublicAdCard } from "@/lib/ads";
import { ResponsiveMediaImg } from "@/app/components/ResponsiveMediaImg";
import { IMAGE_SIZES, SRCSET_WIDTHS } from "@/lib/cloudinary-image";
import { trackAdAnalytics } from "@/lib/ad-analytics-client";

type BlogAdSnippetsProps = {
  ads: PublicAdCard[];
  className?: string;
};

const MAX = 3;

/**
 * Mini sidebar promos: thumbnail + title + CTA, same live ads as the homepage (subset).
 */
export function BlogAdSnippets({ ads, className = "" }: BlogAdSnippetsProps) {
  const items = useMemo(() => ads.slice(0, MAX), [ads]);
  const itemIds = items.map((ad) => ad.id).join(",");

  useEffect(() => {
    for (const ad of items) {
      if (!/^[a-f0-9]{24}$/i.test(ad.id)) continue;
      trackAdAnalytics({
        kind: "ad",
        assetId: ad.id,
        type: "impression",
        placement: "blog",
      });
    }
  }, [itemIds, items]);

  if (ads.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-gray-200/80 bg-gradient-to-b from-[#F0F7FF] to-white p-4 text-center text-xs leading-relaxed text-gray-500 ${className}`}
      >
        No promos right now. See featured offers on the{" "}
        <Link href="/" className="font-semibold text-[#007AFF] hover:underline">
          homepage
        </Link>
        .
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="mb-4 text-lg font-bold border-l-4 border-[#007AFF] pl-3">
        Promos &amp; offers
      </h3>
      <div className="flex flex-col gap-2.5">
        {items.map((ad) => (
          <Link
            key={ad.id}
            href={ad.ctaLink}
            onClick={() =>
              trackAdAnalytics({
                kind: "ad",
                assetId: ad.id,
                type: "click",
                placement: "blog",
              })
            }
            className="group flex gap-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-2 shadow-sm ring-1 ring-gray-900/[0.04] transition hover:ring-[#007AFF]/25"
          >
            <div className="relative h-[4.5rem] w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
              <ResponsiveMediaImg
                src={ad.imageUrl}
                alt={ad.title}
                sizes={IMAGE_SIZES.thumb}
                widths={SRCSET_WIDTHS.thumb}
                widthHint={192}
                className="h-full w-full object-contain"
              />
              {ad.videoUrl ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/10"
                  aria-hidden
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#007AFF] shadow-sm">
                    <Play className="h-3.5 w-3.5 pl-0.5" strokeWidth={2} />
                  </span>
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex flex-1 flex-col justify-center py-0.5">
              <p className="line-clamp-2 text-left text-sm font-semibold leading-snug text-[#111827] group-hover:text-[#007AFF]">
                {ad.title}
              </p>
              <p className="mt-0.5 text-left text-xs font-medium text-[#007AFF]">
                {ad.ctaText} <span aria-hidden>→</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
