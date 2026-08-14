import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { findSchoolById } from "../../../../lib/admissions/schools";
import {
  admissionProgrammesCollection,
  ensureAdmissionProgrammeIndexes,
  serializeAdmissionProgramme,
} from "../../../../lib/admissions/programmes";

/** Public: programmes + streams for a partner school application form */
export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get("schoolId")?.trim() || "";
    if (!ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const db = await getDb();
    const school = await findSchoolById(db, schoolId);
    if (!school?.isPartner || school.isActive === false) {
      return NextResponse.json({ error: "School not available" }, { status: 404 });
    }

    await ensureAdmissionProgrammeIndexes(db);
    const docs = await admissionProgrammesCollection(db)
      .find({ schoolId: new ObjectId(schoolId), isActive: { $ne: false } })
      .sort({ name: 1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      ok: true,
      programmes: docs.map(serializeAdmissionProgramme),
    });
  } catch (error) {
    console.error("[apply/programmes]", error);
    return NextResponse.json({ error: "Failed to load programmes" }, { status: 500 });
  }
}
