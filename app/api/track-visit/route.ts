import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { startOfDay } from "../../../lib/analytics-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { path, visitorId } = body as {
      path?: string;
      visitorId?: string;
    };

    const normalizedPath =
      typeof path === "string" && path.startsWith("/") ? path : "/";
    const normalizedVisitorId =
      typeof visitorId === "string" ? visitorId.trim() : "";

    if (!normalizedVisitorId) {
      return NextResponse.json(
        { error: "Missing visitor identifier" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const visits = db.collection<{
      occurredAt: Date;
      path: string;
      visitorId: string;
    }>("visits");

    const dayStart = startOfDay(new Date());
    const existing = await visits.findOne({
      visitorId: normalizedVisitorId,
      path: normalizedPath,
      occurredAt: { $gte: dayStart },
    });

    if (existing) {
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
    }

    await visits.insertOne({
      occurredAt: new Date(),
      path: normalizedPath,
      visitorId: normalizedVisitorId,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[track-visit] POST error", error);
    return NextResponse.json(
      { error: "Failed to record visit" },
      { status: 500 },
    );
  }
}
