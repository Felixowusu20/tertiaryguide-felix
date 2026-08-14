import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import {
  ensureSchoolIndexes,
  findSchoolBySlug,
  serializePartnerSchool,
} from "../../../../../lib/admissions/schools";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const db = await getDb();
    await ensureSchoolIndexes(db);
    const school = await findSchoolBySlug(db, slug);

    if (!school || school.isPartner !== true || school.isActive === false) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      school: serializePartnerSchool(school),
    });
  } catch (error) {
    console.error("[apply/schools/:slug] GET", error);
    return NextResponse.json(
      { error: "Failed to load school" },
      { status: 500 },
    );
  }
}
