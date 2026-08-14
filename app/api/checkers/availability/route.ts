import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection<{ status: "Issued" | "Unissued" }>(
      "checkers",
    );

    const unissuedCount = await collection.countDocuments({ status: "Unissued" });

    return NextResponse.json({ ok: true, unissuedCount }, { status: 200 });
  } catch (error) {
    console.error("[checkers/availability] GET error", error);
    return NextResponse.json(
      { error: "Failed to check checker availability" },
      { status: 500 },
    );
  }
}
