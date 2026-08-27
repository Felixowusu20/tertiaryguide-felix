import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { AdDoc } from "@/lib/ads";
import { serializeAdDoc } from "@/lib/ads";
import { parseOptionalEmail, parseOptionalText } from "@/lib/ad-analytics";
import { resolveStoredAdImageUrl } from "@/lib/adVideo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const ad = await db
      .collection<AdDoc>("ads")
      .findOne({ _id: new ObjectId(id) });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ad: serializeAdDoc(ad) });
  } catch (error) {
    console.error("[admin/ads/[id]] GET", error);
    return NextResponse.json(
      { error: "Failed to load ad" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const db = await getDb();
    const oid = new ObjectId(id);
    const existing = await db.collection<AdDoc>("ads").findOne({ _id: oid });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const $set: Partial<AdDoc> = { updatedAt: new Date() };

    if (typeof body.title === "string") $set.title = body.title;
    if (typeof body.description === "string")
      $set.description = body.description;
    if (typeof body.imageUrl === "string") {
      const trimmed = body.imageUrl.trim();
      if (trimmed) {
        $set.imageUrl = trimmed;
      } else if (
        "videoUrl" in body &&
        body.videoUrl != null &&
        String(body.videoUrl).trim() !== ""
      ) {
        $set.imageUrl = resolveStoredAdImageUrl(
          "",
          String(body.videoUrl).trim(),
        );
      } else {
        $set.imageUrl = existing.imageUrl;
      }
    }
    if ("videoUrl" in body) {
      const v = body.videoUrl;
      $set.videoUrl =
        v == null || v === "" ? null : String(v);
    }
    if ("targetUrl" in body) {
      const t = body.targetUrl;
      $set.targetUrl = t == null || t === "" ? null : String(t);
    }
    if (typeof body.ctaText === "string") $set.ctaText = body.ctaText;
    if ("advertiserName" in body) {
      $set.advertiserName = parseOptionalText(body.advertiserName);
    }
    if ("advertiserEmail" in body) {
      $set.advertiserEmail = parseOptionalEmail(body.advertiserEmail);
    }
    if ("campaignName" in body) {
      $set.campaignName = parseOptionalText(body.campaignName);
    }
    if (typeof body.isActive === "boolean") $set.isActive = body.isActive;
    if (body.startDate != null) {
      const d = new Date(String(body.startDate));
      if (!Number.isNaN(d.getTime())) $set.startDate = d;
    }
    if (body.endDate != null) {
      const d = new Date(String(body.endDate));
      if (!Number.isNaN(d.getTime())) $set.endDate = d;
    }

    const result = await db.collection<AdDoc>("ads").findOneAndUpdate(
      { _id: oid },
      { $set },
      { returnDocument: "after" },
    );
    // Driver returns the document directly; older code expected { value }.
    const updated =
      (result as { value?: AdDoc | null } | null)?.value ?? (result as AdDoc | null);

    if (!updated) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    if (updated.endDate < updated.startDate) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, ad: serializeAdDoc(updated) });
  } catch (error) {
    console.error("[admin/ads/[id]] PUT", error);
    return NextResponse.json(
      { error: "Failed to update ad" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection("ads")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/ads/[id]] DELETE", error);
    return NextResponse.json(
      { error: "Failed to delete ad" },
      { status: 500 },
    );
  }
}
