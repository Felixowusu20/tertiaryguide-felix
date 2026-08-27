import { ObjectId, type Db } from "mongodb";
import { getDb } from "./mongodb";
import type { AdDoc } from "./ads";
import type { ExplorePostDoc } from "./explore/types";

export const AD_EVENT_KINDS = ["ad", "explore"] as const;
export type AdEventKind = (typeof AD_EVENT_KINDS)[number];

export const AD_EVENT_TYPES = ["impression", "view", "click"] as const;
export type AdEventType = (typeof AD_EVENT_TYPES)[number];

export const AD_PLACEMENTS = ["homepage", "blog", "explore"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export type AdEventDoc = {
  _id?: ObjectId;
  kind: AdEventKind;
  assetId: ObjectId;
  type: AdEventType;
  placement: AdPlacement;
  dayKey: string;
  sessionKey: string;
  occurredAt: Date;
};

export type AdvertiserReportRow = {
  kind: AdEventKind;
  assetId: string;
  title: string;
  campaignName: string;
  advertiserName: string;
  advertiserEmail: string;
  placement: string;
  impressions: number;
  views: number;
  clicks: number;
  ctr: number;
  likes?: number;
  comments?: number;
};

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function parseOptionalEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export function parseOptionalText(raw: unknown, max = 160): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return null;
  return value.slice(0, max);
}

export function adEventsCollection(db: Db) {
  return db.collection<AdEventDoc>("adEvents");
}

export async function ensureAdAnalyticsIndexes(db: Db) {
  const events = adEventsCollection(db);
  try {
    await Promise.all([
      events.createIndex({ occurredAt: -1 }),
      events.createIndex({ kind: 1, assetId: 1, occurredAt: -1 }),
      events.createIndex(
        { kind: 1, assetId: 1, type: 1, sessionKey: 1, dayKey: 1 },
        {
          unique: true,
          partialFilterExpression: { type: { $in: ["impression", "view"] } },
        },
      ),
    ]);
  } catch (error) {
    console.error("[ad-analytics] index", error);
  }
}

function sanitizeSessionKey(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function recordAdEvent(input: {
  kind: AdEventKind;
  assetId: string;
  type: AdEventType;
  placement: AdPlacement;
  sessionKey?: string | null;
}): Promise<{ recorded: boolean }> {
  if (!ObjectId.isValid(input.assetId)) return { recorded: false };
  const sessionKey = sanitizeSessionKey(input.sessionKey);
  if (!sessionKey) return { recorded: false };

  const db = await getDb();
  await ensureAdAnalyticsIndexes(db);
  const now = new Date();
  const doc: AdEventDoc = {
    kind: input.kind,
    assetId: new ObjectId(input.assetId),
    type: input.type,
    placement: input.placement,
    dayKey: utcDayKey(now),
    sessionKey,
    occurredAt: now,
  };

  try {
    await adEventsCollection(db).insertOne(doc);
    return { recorded: true };
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code === 11000) return { recorded: false };
    throw error;
  }
}

function ctr(clicks: number, impressions: number) {
  if (impressions <= 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100;
}

export async function buildAdvertiserReport(opts: {
  from: Date;
  to: Date;
  advertiserEmail?: string | null;
}): Promise<{
  from: string;
  to: string;
  rows: AdvertiserReportRow[];
  totals: {
    impressions: number;
    views: number;
    clicks: number;
    ctr: number;
    campaigns: number;
  };
}> {
  const db = await getDb();
  await ensureAdAnalyticsIndexes(db);
  const from = opts.from;
  const to = opts.to;

  const events = await adEventsCollection(db)
    .find({ occurredAt: { $gte: from, $lte: to } })
    .toArray();

  const ads = await db.collection<AdDoc>("ads").find({}).toArray();
  const posts = await db.collection<ExplorePostDoc>("explorePosts").find({}).toArray();

  const adsById = new Map(ads.map((ad) => [String(ad._id), ad]));
  const postsById = new Map(posts.map((post) => [String(post._id), post]));
  const filterEmail = opts.advertiserEmail?.trim().toLowerCase() || null;

  type Acc = {
    kind: AdEventKind;
    assetId: string;
    placement: string;
    impressions: number;
    views: number;
    clicks: number;
  };
  const buckets = new Map<string, Acc>();

  for (const event of events) {
    const assetId = String(event.assetId);
    const key = `${event.kind}:${assetId}:${event.placement}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        kind: event.kind,
        assetId,
        placement: event.placement,
        impressions: 0,
        views: 0,
        clicks: 0,
      };
      buckets.set(key, bucket);
    }
    if (event.type === "impression") bucket.impressions += 1;
    if (event.type === "view") bucket.views += 1;
    if (event.type === "click") bucket.clicks += 1;
  }

  const rows: AdvertiserReportRow[] = [];
  for (const bucket of buckets.values()) {
    const ad = bucket.kind === "ad" ? adsById.get(bucket.assetId) : null;
    const post = bucket.kind === "explore" ? postsById.get(bucket.assetId) : null;
    const advertiserEmail = (
      (bucket.kind === "ad" ? ad?.advertiserEmail : post?.advertiserEmail) || ""
    )
      .trim()
      .toLowerCase();
    if (filterEmail && advertiserEmail !== filterEmail) continue;

    const title =
      bucket.kind === "ad"
        ? ad?.title || "Deleted ad"
        : (post?.body || "").trim().slice(0, 80) ||
          `${post?.postType || "explore"} post`;
    const campaignName =
      (bucket.kind === "ad" ? ad?.campaignName : post?.campaignName) || "";
    const advertiserName =
      (bucket.kind === "ad" ? ad?.advertiserName : post?.advertiserName) || "";

    rows.push({
      kind: bucket.kind,
      assetId: bucket.assetId,
      title,
      campaignName,
      advertiserName,
      advertiserEmail,
      placement: bucket.placement,
      impressions: bucket.impressions,
      views: bucket.views,
      clicks: bucket.clicks,
      ctr: ctr(bucket.clicks, bucket.impressions),
      likes: post?.likeCount,
      comments: post?.commentCount,
    });
  }

  rows.sort((a, b) => b.impressions - a.impressions || a.title.localeCompare(b.title));

  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const views = rows.reduce((sum, row) => sum + row.views, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const advertisers = new Set(
    rows.map((row) => row.advertiserEmail).filter(Boolean),
  );

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
    totals: {
      impressions,
      views,
      clicks,
      ctr: ctr(clicks, impressions),
      campaigns: advertisers.size || rows.length,
    },
  };
}

export function reportRowsToSheet(rows: AdvertiserReportRow[]) {
  return rows.map((row) => ({
    Type: row.kind === "ad" ? "Homepage / blog ad" : "Explore post",
    Title: row.title,
    Campaign: row.campaignName,
    Advertiser: row.advertiserName,
    Email: row.advertiserEmail,
    Location: row.placement,
    Impressions: row.impressions,
    Views: row.views,
    Clicks: row.clicks,
    "CTR (%)": row.ctr,
    Likes: row.likes ?? "",
    Comments: row.comments ?? "",
  }));
}
