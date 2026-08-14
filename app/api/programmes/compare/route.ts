import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { effectiveVoucherPrice } from "../../../../lib/admissions/schools";
import { normalizeBrandColor } from "../../../../lib/brand-theme";

interface CatalogueProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff: string;
  preRequisite?: string | null;
  durationYears?: number | null;
}

interface AdmissionProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff?: string | null;
  preRequisite?: string | null;
  durationYears?: number | null;
  isActive?: boolean;
}

interface SchoolDoc {
  _id?: ObjectId;
  name: string;
  alias?: string | null;
  slug?: string | null;
  logoSrc?: string | null;
  priceGhs?: number | null;
  voucherPrice?: number | null;
  deadline?: Date | null;
  preRequisite?: string | null;
  durationYears?: number | null;
  isPartner?: boolean;
  isActive?: boolean;
  brandColor?: string | null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function schoolPayload(school: SchoolDoc) {
  if (!school._id) return null;
  if (school.isPartner === true && school.isActive === false) return null;

  const price =
    school.isPartner === true
      ? effectiveVoucherPrice(school)
      : typeof school.priceGhs === "number"
        ? school.priceGhs
        : null;

  return {
    id: school._id.toHexString(),
    name: school.name,
    alias: school.alias ?? null,
    slug: school.slug ?? null,
    logoSrc: school.logoSrc ?? null,
    priceGhs: price,
    deadline: school.deadline ? school.deadline.toISOString() : null,
    isPartner: school.isPartner === true,
    brandColor: normalizeBrandColor(school.brandColor),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const programmeId = (searchParams.get("programmeId") || "").trim();
    const source = (searchParams.get("source") || "catalog").trim();

    if (!programmeId || !ObjectId.isValid(programmeId)) {
      return NextResponse.json(
        { error: "Invalid or missing programmeId" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const catalogueProgrammes =
      db.collection<CatalogueProgrammeDoc>("programmes");
    const admissionProgrammes =
      db.collection<AdmissionProgrammeDoc>("admissionProgrammes");
    const schools = db.collection<SchoolDoc>("schools");

    let programmeName = "";
    let seedSchoolId: string | null = null;

    if (source === "partner") {
      const base = await admissionProgrammes.findOne({
        _id: new ObjectId(programmeId),
        isActive: { $ne: false },
      });
      if (!base) {
        return NextResponse.json(
          { error: "Programme not found" },
          { status: 404 },
        );
      }
      programmeName = base.name;
      seedSchoolId = base.schoolId.toHexString();
    } else {
      const base = await catalogueProgrammes.findOne({
        _id: new ObjectId(programmeId),
      });
      if (!base) {
        // Fallback: try partner collection if source was wrong/missing
        const partnerBase = await admissionProgrammes.findOne({
          _id: new ObjectId(programmeId),
          isActive: { $ne: false },
        });
        if (!partnerBase) {
          return NextResponse.json(
            { error: "Programme not found" },
            { status: 404 },
          );
        }
        programmeName = partnerBase.name;
        seedSchoolId = partnerBase.schoolId.toHexString();
      } else {
        programmeName = base.name;
        seedSchoolId = base.schoolId.toHexString();
      }
    }

    const nameRegex = new RegExp(`^${escapeRegex(programmeName)}$`, "i");

    const [catalogueMatches, admissionMatches, allSchoolDocs] =
      await Promise.all([
        catalogueProgrammes.find({ name: nameRegex }).limit(200).toArray(),
        admissionProgrammes
          .find({ name: nameRegex, isActive: { $ne: false } })
          .limit(200)
          .toArray(),
        schools
          .find({
            $or: [
              { isPartner: { $ne: true } },
              { isPartner: true, isActive: { $ne: false } },
            ],
          })
          .sort({ name: 1 })
          .limit(500)
          .toArray(),
      ]);

    const schoolMap = new Map<string, SchoolDoc>();
    for (const s of allSchoolDocs) {
      if (s._id) schoolMap.set(s._id.toHexString(), s);
    }

    type CompareRow = {
      programmeId: string | null;
      source: "catalog" | "partner" | null;
      name: string;
      cutoff: string | null;
      preRequisite: string | null;
      durationYears: number | null;
      offersProgramme: boolean;
      school: NonNullable<ReturnType<typeof schoolPayload>>;
    };

    const bySchoolId = new Map<string, CompareRow>();

    for (const p of catalogueMatches) {
      const school = schoolMap.get(p.schoolId.toHexString());
      if (!school) continue;
      const payload = schoolPayload(school);
      if (!payload) continue;
      bySchoolId.set(payload.id, {
        programmeId: String(p._id),
        source: "catalog",
        name: p.name,
        cutoff: p.cutoff ?? null,
        preRequisite: p.preRequisite ?? school.preRequisite ?? null,
        durationYears: p.durationYears ?? school.durationYears ?? null,
        offersProgramme: true,
        school: payload,
      });
    }

    for (const p of admissionMatches) {
      const school = schoolMap.get(p.schoolId.toHexString());
      if (!school) continue;
      const payload = schoolPayload(school);
      if (!payload) continue;
      // Prefer existing catalog match if both exist
      if (bySchoolId.has(payload.id)) continue;
      bySchoolId.set(payload.id, {
        programmeId: String(p._id),
        source: "partner",
        name: p.name,
        cutoff: p.cutoff ?? null,
        preRequisite: p.preRequisite ?? school.preRequisite ?? null,
        durationYears: p.durationYears ?? school.durationYears ?? null,
        offersProgramme: true,
        school: payload,
      });
    }

    // Every school on the platform is available to add for comparison
    const schoolsForPicker = allSchoolDocs
      .map((s) => schoolPayload(s))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => {
        const match = bySchoolId.get(s.id);
        return {
          ...s,
          offersProgramme: Boolean(match?.offersProgramme),
          programmeId: match?.programmeId ?? null,
          source: match?.source ?? null,
          cutoff: match?.cutoff ?? null,
          preRequisite: match?.preRequisite ?? null,
          durationYears: match?.durationYears ?? null,
        };
      });

    const items = Array.from(bySchoolId.values()).sort((a, b) =>
      a.school.name.localeCompare(b.school.name),
    );

    return NextResponse.json({
      ok: true,
      programmeName,
      seedSchoolId,
      items,
      schools: schoolsForPicker,
    });
  } catch (error) {
    console.error("[programmes/compare] GET error", error);
    return NextResponse.json(
      { error: "Failed to load programme comparison" },
      { status: 500 },
    );
  }
}
