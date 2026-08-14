import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import { findSchoolBySlug, serializePartnerSchool } from "../../../../../lib/admissions/schools";
import { getSchoolDashboardMetrics } from "../../../../../lib/admissions/analytics";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const school = await findSchoolBySlug(db, slug);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const metrics = await getSchoolDashboardMetrics(db, auth.schoolId);

    return NextResponse.json({
      ok: true,
      school: serializePartnerSchool(school),
      metrics,
      actor: {
        kind: auth.actor.kind,
        username: auth.actor.user.username,
        role: auth.actor.user.role,
      },
    });
  } catch (error) {
    console.error("[school-portal/metrics]", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
