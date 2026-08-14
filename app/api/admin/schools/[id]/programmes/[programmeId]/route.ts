import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

interface ProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff: string;
  preRequisite?: string | null;
  durationYears?: number | null;
  createdAt: Date;
}

function parseBody(body: unknown) {
  const b = body as Record<string, unknown> | null;
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  const cutoff = typeof b?.cutoff === "string" ? b.cutoff.trim() : "";
  const preRequisiteRaw = b?.preRequisite;
  const preRequisite =
    typeof preRequisiteRaw === "string" ? preRequisiteRaw.trim() : "";
  const durationYearsRaw = b?.durationYears;

  let durationYears: number | null = null;
  if (
    durationYearsRaw !== undefined &&
    durationYearsRaw !== null &&
    durationYearsRaw !== ""
  ) {
    const n = Number(durationYearsRaw);
    durationYears = Number.isFinite(n) && n > 0 ? n : null;
  }

  return { name, cutoff, preRequisite, durationYears };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; programmeId: string }> },
) {
  try {
    const { id: schoolId, programmeId } = await params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }
    if (!programmeId || !ObjectId.isValid(programmeId)) {
      return NextResponse.json({ error: "Invalid programme id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const { name, cutoff, preRequisite, durationYears } = parseBody(body);

    if (!name) {
      return NextResponse.json(
        { error: "Programme name is required" },
        { status: 400 },
      );
    }
    if (!cutoff) {
      return NextResponse.json(
        { error: "Cut-off point is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const programmes = db.collection<ProgrammeDoc>("programmes");
    const oid = new ObjectId(programmeId);
    const schoolOid = new ObjectId(schoolId);

    const existing = await programmes.findOne({ _id: oid });
    if (!existing) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
    if (existing.schoolId.toHexString() !== schoolOid.toHexString()) {
      return NextResponse.json(
        { error: "Programme does not belong to this school" },
        { status: 400 },
      );
    }

    await programmes.updateOne(
      { _id: oid },
      {
        $set: {
          name,
          cutoff,
          preRequisite: preRequisite || null,
          durationYears,
        },
      },
    );

    const doc = await programmes.findOne({ _id: oid });
    if (!doc) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      programme: {
        id: String(doc._id),
        name: doc.name,
        cutoff: doc.cutoff,
        preRequisite: doc.preRequisite ?? null,
        durationYears: doc.durationYears ?? null,
        createdAt: doc.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/.../programmes/[programmeId]] PUT error", error);
    return NextResponse.json(
      { error: "Failed to update programme" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; programmeId: string }> },
) {
  try {
    const { id: schoolId, programmeId } = await params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }
    if (!programmeId || !ObjectId.isValid(programmeId)) {
      return NextResponse.json({ error: "Invalid programme id" }, { status: 400 });
    }

    const db = await getDb();
    const programmes = db.collection<ProgrammeDoc>("programmes");
    const oid = new ObjectId(programmeId);
    const schoolOid = new ObjectId(schoolId);

    const existing = await programmes.findOne({ _id: oid });
    if (!existing) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
    if (existing.schoolId.toHexString() !== schoolOid.toHexString()) {
      return NextResponse.json(
        { error: "Programme does not belong to this school" },
        { status: 400 },
      );
    }

    const result = await programmes.deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/.../programmes/[programmeId]] DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete programme" },
      { status: 500 },
    );
  }
}
