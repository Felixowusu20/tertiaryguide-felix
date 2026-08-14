import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";

interface ProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff: string;
  preRequisite?: string | null;
  durationYears?: number | null;
  createdAt: Date;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: schoolId } = await context.params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const db = await getDb();
    const programmes = db.collection<ProgrammeDoc>("programmes");

    const docs = await programmes
      .find({ schoolId: new ObjectId(schoolId) }, { sort: { createdAt: -1 } })
      .limit(200)
      .toArray();

    const items = docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      cutoff: doc.cutoff,
      preRequisite: doc.preRequisite ?? null,
      durationYears: doc.durationYears ?? null,
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, programmes: items }, { status: 200 });
  } catch (error) {
    console.error("[admin/schools/[id]/programmes] GET error", error);
    return NextResponse.json(
      { error: "Failed to load programmes" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: schoolId } = await context.params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null as unknown as null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const cutoff = typeof body?.cutoff === "string" ? body.cutoff.trim() : "";
    const preRequisiteRaw = body?.preRequisite;
    const preRequisite =
      typeof preRequisiteRaw === "string" ? preRequisiteRaw.trim() : "";
    const durationYearsRaw = body?.durationYears;

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

    let durationYears: number | null = null;
    if (
      durationYearsRaw !== undefined &&
      durationYearsRaw !== null &&
      durationYearsRaw !== ""
    ) {
      const n = Number(durationYearsRaw);
      durationYears = Number.isFinite(n) && n > 0 ? n : null;
    }

    const db = await getDb();
    const programmes = db.collection<ProgrammeDoc>("programmes");

    await programmes.createIndex({ schoolId: 1, name: 1 });

    const now = new Date();

    const result = await programmes.insertOne({
      schoolId: new ObjectId(schoolId),
      name,
      cutoff,
      preRequisite: preRequisite || null,
      durationYears,
      createdAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        programme: {
          id: result.insertedId.toString(),
          name,
          cutoff,
          preRequisite: preRequisite || null,
          durationYears,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/schools/[id]/programmes] POST error", error);
    return NextResponse.json(
      { error: "Failed to create programme" },
      { status: 500 },
    );
  }
}
