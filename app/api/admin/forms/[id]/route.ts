import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = await getDb();
    const r = await db
      .collection("voucherPayments")
      .deleteOne({ _id: new ObjectId(id) });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/forms/[id]] DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 },
    );
  }
}
