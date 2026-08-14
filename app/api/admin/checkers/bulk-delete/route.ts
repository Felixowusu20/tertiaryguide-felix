import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { invalidateCheckersCache } from "../../../../../lib/redis";

const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const raw = body?.ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Expected a non-empty ids array" },
        { status: 400 },
      );
    }
    if (raw.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `At most ${MAX_BATCH} checkers per request` },
        { status: 400 },
      );
    }
    const oids: ObjectId[] = [];
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const s = item.trim();
      if (ObjectId.isValid(s)) oids.push(new ObjectId(s));
    }
    if (oids.length === 0) {
      return NextResponse.json({ error: "No valid ids" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection("checkers")
      .deleteMany({ _id: { $in: oids } });

    await invalidateCheckersCache();

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("[admin/checkers/bulk-delete] POST error", error);
    return NextResponse.json(
      { error: "Failed to delete checkers" },
      { status: 500 },
    );
  }
}
