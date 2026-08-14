import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { invalidateCheckersCache } from "../../../../../lib/redis";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection("checkers")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Checker not found" }, { status: 404 });
    }

    await invalidateCheckersCache();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/checkers/[id]] DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete checker" },
      { status: 500 },
    );
  }
}
