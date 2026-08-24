import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../../lib/admin-access";
import { findSchoolById } from "../../../../../../lib/admissions/schools";
import {
  applicationsCollection,
  isApplicationStatus,
  serializeApplication,
} from "../../../../../../lib/admissions/applications";
import { sendApplicationStatusUpdateToApplicant } from "../../../../../../lib/email";

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
    const existing = await applicationsCollection(db).findOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await applicationsCollection(db).updateOne(
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
    );

    const refreshed = await applicationsCollection(db).findOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId,
    });
    if (!refreshed) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const serialized = serializeApplication(refreshed);
    const statusChanged = existing.status !== status;

    if (statusChanged && serialized.email) {
      try {
        const school = await findSchoolById(db, String(auth.schoolId));
        await sendApplicationStatusUpdateToApplicant({
          to: serialized.email,
          applicantName: serialized.fullName,
          schoolName: school?.name || "the school",
          applicationNumber: serialized.applicationNumber,
          status,
          programme: serialized.programme,
          reviewNotes: serialized.reviewNotes,
        });
      } catch (emailError) {
        console.error("[school-portal/applications/:id] status email", emailError);
      }
    }

    return NextResponse.json({
      ok: true,
      emailed: statusChanged && Boolean(serialized.email),
      application: serialized,
    });
  } catch (error) {
    console.error("[school-portal/applications/:id] PATCH", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
