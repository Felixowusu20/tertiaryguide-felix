import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  ensureSchoolIndexes,
  listPartnerSchools,
  serializePartnerSchool,
} from "../../../../lib/admissions/schools";

export async function GET() {
  try {
    const db = await getDb();
    await ensureSchoolIndexes(db);
    const docs = await listPartnerSchools(db, { activeOnly: true });
    return NextResponse.json({
      ok: true,
      schools: docs.map(serializePartnerSchool),
    });
  } catch (error) {
    console.error("[apply/schools] GET", error);
    return NextResponse.json({ error: "Failed to load schools" }, { status: 500 });
  }
}
