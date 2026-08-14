import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import {
  admissionProgrammesCollection,
  ensureAdmissionProgrammeIndexes,
  serializeAdmissionProgramme,
} from "../../../../../lib/admissions/programmes";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  const db = await getDb();
  await ensureAdmissionProgrammeIndexes(db);
  const docs = await admissionProgrammesCollection(db)
    .find({ schoolId: auth.schoolId })
    .sort({ name: 1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    ok: true,
    programmes: docs.map(serializeAdmissionProgramme),
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Programme name is required" }, { status: 400 });
    }

    const streams = Array.isArray(body?.streams)
      ? body.streams
          .filter((s: unknown): s is string => typeof s === "string")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : typeof body?.streams === "string"
        ? body.streams.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    if (streams.length === 0) {
      return NextResponse.json(
        { error: "At least one stream is required (e.g. Regular, Evening)" },
        { status: 400 },
      );
    }

    const intakeOptions = Array.isArray(body?.intakeOptions)
      ? body.intakeOptions
          .filter((s: unknown): s is string => typeof s === "string")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : typeof body?.intakeOptions === "string"
        ? body.intakeOptions.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    const db = await getDb();
    await ensureAdmissionProgrammeIndexes(db);
    const now = new Date();
    const result = await admissionProgrammesCollection(db).insertOne({
      schoolId: auth.schoolId,
      name,
      streams,
      intakeOptions,
      cutoff: typeof body?.cutoff === "string" ? body.cutoff.trim() || null : null,
      preRequisite:
        typeof body?.preRequisite === "string" ? body.preRequisite.trim() || null : null,
      durationYears:
        body?.durationYears !== undefined && body?.durationYears !== ""
          ? Number(body.durationYears) || null
          : null,
      isActive: body?.isActive !== false,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await admissionProgrammesCollection(db).findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(
      {
        ok: true,
        programme: doc ? serializeAdmissionProgramme(doc) : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[school-portal/programmes] POST", error);
    return NextResponse.json({ error: "Failed to create programme" }, { status: 500 });
  }
}
