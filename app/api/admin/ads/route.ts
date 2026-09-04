import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { AdDoc } from "@/lib/ads";
import { serializeAdDoc } from "@/lib/ads";
import { parseOptionalEmail, parseOptionalText } from "@/lib/ad-analytics";
import { resolveStoredAdImageUrl } from "@/lib/adVideo";

export async function GET() {
  try {
    const db = await getDb();
    const ads = await db
      .collection<AdDoc>("ads")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      ads: ads.map((a) => serializeAdDoc(a)),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const imageUrlInput =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const start = new Date(String(body.startDate));
    const end = new Date(String(body.endDate));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "startDate and endDate must be valid dates" },
        { status: 400 },
      );
    }
    if (end < start) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const videoUrlRaw = body.videoUrl;
    const videoUrl =
      videoUrlRaw == null || String(videoUrlRaw).trim() === ""
        ? null
        : String(videoUrlRaw).trim();

    const imageUrl = resolveStoredAdImageUrl(imageUrlInput, videoUrl);
    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl or videoUrl is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const now = new Date();
    const targetUrlRaw = body.targetUrl;
    const targetUrl =
      targetUrlRaw == null || String(targetUrlRaw).trim() === ""
        ? null
        : String(targetUrlRaw).trim();
    const ctaText =
      typeof body.ctaText === "string" && body.ctaText.trim() !== ""
        ? body.ctaText.trim()
        : "Learn more";

    const doc: AdDoc = {
      title,
      description: description || undefined,
      imageUrl,
      videoUrl,
      targetUrl,
      ctaText,
      advertiserName: parseOptionalText(body.advertiserName),
      advertiserEmail: parseOptionalEmail(body.advertiserEmail),
      campaignName: parseOptionalText(body.campaignName),
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      startDate: start,
      endDate: end,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<AdDoc>("ads").insertOne(doc);
    const created = await db.collection<AdDoc>("ads").findOne({
      _id: result.insertedId,
    });
    if (!created) {
      return NextResponse.json(
        { error: "Failed to load created ad" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, ad: serializeAdDoc(created) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
