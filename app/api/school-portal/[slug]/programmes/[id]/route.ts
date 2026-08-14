import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../../lib/admin-access";
import {
  admissionProgrammesCollection,
  serializeAdmissionProgramme,
} from "../../../../../../lib/admissions/programmes";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid programme id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const $set: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body?.name === "string" && body.name.trim()) {
      $set.name = body.name.trim();
    }
    if (body?.streams !== undefined) {
      const streams = Array.isArray(body.streams)
        ? body.streams
            .filter((s: unknown): s is string => typeof s === "string")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : typeof body.streams === "string"
          ? body.streams.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      if (streams.length === 0) {
        return NextResponse.json({ error: "At least one stream is required" }, { status: 400 });
      }
      $set.streams = streams;
    }
    if (body?.intakeOptions !== undefined) {
      $set.intakeOptions = Array.isArray(body.intakeOptions)
        ? body.intakeOptions
            .filter((s: unknown): s is string => typeof s === "string")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    }
    if (typeof body?.isActive === "boolean") $set.isActive = body.isActive;
    if (typeof body?.cutoff === "string") $set.cutoff = body.cutoff.trim() || null;

    const db = await getDb();
    await admissionProgrammesCollection(db).updateOne(
      { _id: new ObjectId(id), schoolId: auth.schoolId },
      { $set },
    );
    const doc = await admissionProgrammesCollection(db).findOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId,
    });
    if (!doc) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, programme: serializeAdmissionProgramme(doc) });
  } catch (error) {
    console.error("[school-portal/programmes/:id] PATCH", error);
    return NextResponse.json({ error: "Failed to update programme" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid programme id" }, { status: 400 });
  }

  const db = await getDb();
  const result = await admissionProgrammesCollection(db).deleteOne({
    _id: new ObjectId(id),
    schoolId: auth.schoolId,
  });
  if (!result.deletedCount) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
