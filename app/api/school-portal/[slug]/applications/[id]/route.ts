import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../../lib/admin-access";
import {
  applicationsCollection,
  isApplicationStatus,
  serializeApplication,
} from "../../../../../../lib/admissions/applications";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await applicationsCollection(db).findOne({
    _id: new ObjectId(id),
    schoolId: auth.schoolId,
  });
  if (!doc) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, application: serializeApplication(doc) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const status = body?.status;
    if (!isApplicationStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const reviewNotes =
      typeof body?.reviewNotes === "string" ? body.reviewNotes.trim() : undefined;

    const db = await getDb();
    const result = await applicationsCollection(db).findOneAndUpdate(
      { _id: new ObjectId(id), schoolId: auth.schoolId },
      {
        $set: {
          status,
          updatedAt: new Date(),
          reviewedAt: new Date(),
          reviewedBy: auth.actor.user.username,
          ...(reviewNotes !== undefined ? { reviewNotes } : {}),
        },
      },
      { returnDocument: "after" },
    );

    const doc =
      (result as { value?: typeof result } | null)?.value ??
      (result as { _id?: ObjectId } | null);

    if (!doc || !("_id" in doc) || !doc._id) {
      // Mongo driver versions differ; re-fetch
      const refreshed = await applicationsCollection(db).findOne({
        _id: new ObjectId(id),
        schoolId: auth.schoolId,
      });
      if (!refreshed) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        application: serializeApplication(refreshed),
      });
    }

    const refreshed = await applicationsCollection(db).findOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId,
    });
    return NextResponse.json({
      ok: true,
      application: refreshed ? serializeApplication(refreshed) : null,
    });
  } catch (error) {
    console.error("[school-portal/applications/:id] PATCH", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
