import type { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

/** Stored in `ads` collection (MongoDB) */
export type AdDoc = {
  _id?: ObjectId;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string | null;
  targetUrl?: string | null;
  ctaText?: string | null;
  advertiserName?: string | null;
  advertiserEmail?: string | null;
  campaignName?: string | null;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SerializedAd = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string | null;
  targetUrl: string | null;
  ctaText: string;
  advertiserName: string;
  advertiserEmail: string;
  campaignName: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeAdDoc(ad: AdDoc): SerializedAd {
  const oid = ad._id;
  if (!oid) {
    throw new Error("serializeAdDoc: missing _id");
  }
  return {
    id: String(oid),
    title: ad.title,
    description: ad.description?.trim() ?? "",
    imageUrl: ad.imageUrl,
    videoUrl: ad.videoUrl ?? null,
    targetUrl: ad.targetUrl ?? null,
    ctaText: (ad.ctaText?.trim() || "Learn more") as string,
    advertiserName: ad.advertiserName?.trim() ?? "",
    advertiserEmail: ad.advertiserEmail?.trim() ?? "",
    campaignName: ad.campaignName?.trim() ?? "",
    isActive: ad.isActive,
    startDate: (ad.startDate ?? new Date(0)).toISOString(),
    endDate: (ad.endDate ?? new Date(0)).toISOString(),
    createdAt: (ad.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (ad.updatedAt ?? ad.createdAt ?? new Date(0)).toISOString(),
  };
}

export function isAdCurrentlyLive(
  ad: AdDoc,
  when: Date = new Date(),
): boolean {
  if (!ad.isActive) return false;
  return when >= ad.startDate && when <= ad.endDate;
}

/** Public card shape (homepage API + blog sidebars) */
export type PublicAdCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string | null;
  ctaText: string;
  ctaLink: string;
};

/** Live homepage ads: active and within schedule (same rules as /api/ads). */
export async function getPublicActiveAds(): Promise<PublicAdCard[]> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .collection<AdDoc>("ads")
    .find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .sort({ createdAt: -1 })
    .toArray();

  return rows
    .filter((a) => isAdCurrentlyLive(a, now))
    .map((a) => {
      const s = serializeAdDoc(a);
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        ctaText: s.ctaText,
        ctaLink: s.targetUrl || "/",
      };
    });
}
