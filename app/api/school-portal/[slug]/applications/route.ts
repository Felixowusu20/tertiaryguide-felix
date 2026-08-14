import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import {
  applicationsCollection,
  ensureApplicationIndexes,
  isApplicationStatus,
  serializeApplication,
} from "../../../../../lib/admissions/applications";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") || 100) || 100, 500);

    const db = await getDb();
    await ensureApplicationIndexes(db);

    const filter: Record<string, unknown> = { schoolId: auth.schoolId };
    if (status && isApplicationStatus(status)) {
      filter.status = status;
    }

    const docs = await applicationsCollection(db)
      .find(filter)
      .sort({ submittedAt: -1 })
      .limit(limit)
      .toArray();

    let applications = docs.map(serializeApplication);
    if (q) {
      applications = applications.filter((a) => {
        const hay = `${a.fullName} ${a.email} ${a.phone ?? ""} ${a.applicationNumber} ${a.programme ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return NextResponse.json({ ok: true, applications });
  } catch (error) {
    console.error("[school-portal/applications] GET", error);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
