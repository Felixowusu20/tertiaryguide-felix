import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

interface CatalogueProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff: string;
  createdAt: Date;
}

interface AdmissionProgrammeDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  cutoff?: string | null;
  isActive?: boolean;
  createdAt: Date;
}

interface SchoolDoc {
  _id?: ObjectId;
  name: string;
  alias?: string | null;
  slug?: string | null;
  isPartner?: boolean;
  isActive?: boolean;
}

type SearchResult = {
  id: string;
  name: string;
  cutoff: string | null;
  source: "catalog" | "partner";
  school: {
    id: string;
    name: string;
    alias: string | null;
    slug: string | null;
    isPartner: boolean;
  } | null;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("query") || "").trim();
    const schoolIdFilter = (searchParams.get("schoolId") || "").trim();

    if (!q) {
      return NextResponse.json({ ok: true, results: [] }, { status: 200 });
    }

    const db = await getDb();
    const catalogueProgrammes =
      db.collection<CatalogueProgrammeDoc>("programmes");
    const admissionProgrammes =
      db.collection<AdmissionProgrammeDoc>("admissionProgrammes");
    const schools = db.collection<SchoolDoc>("schools");

    const regex = new RegExp(escapeRegex(q), "i");
    const schoolObjectId =
      schoolIdFilter && ObjectId.isValid(schoolIdFilter)
        ? new ObjectId(schoolIdFilter)
        : null;

    const [catalogueDocs, admissionDocs] = await Promise.all([
      catalogueProgrammes
        .find({
          name: regex,
          ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
        })
        .limit(40)
        .toArray(),
      admissionProgrammes
        .find({
          name: regex,
          isActive: { $ne: false },
          ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
        })
        .limit(40)
        .toArray(),
    ]);

    const schoolIds = Array.from(
      new Set([
        ...catalogueDocs.map((p) => p.schoolId.toHexString()),
        ...admissionDocs.map((p) => p.schoolId.toHexString()),
      ]),
    );

    const schoolDocs = schoolIds.length
      ? await schools
          .find({ _id: { $in: schoolIds.map((id) => new ObjectId(id)) } })
          .toArray()
      : [];

    const schoolMap = new Map<string, SchoolDoc>();
    for (const s of schoolDocs) {
      if (s._id) schoolMap.set(s._id.toHexString(), s);
    }

    const toSchool = (schoolId: ObjectId) => {
      const school = schoolMap.get(schoolId.toHexString());
      if (!school?._id) return null;
      // Hide inactive partner schools from public search
      if (school.isPartner === true && school.isActive === false) return null;
      return {
        id: school._id.toHexString(),
        name: school.name,
        alias: school.alias ?? null,
        slug: school.slug ?? null,
        isPartner: school.isPartner === true,
      };
    };

    const results: SearchResult[] = [];

    for (const p of catalogueDocs) {
      const school = toSchool(p.schoolId);
      if (!school) continue;
      results.push({
        id: String(p._id),
        name: p.name,
        cutoff: p.cutoff ?? null,
        source: "catalog",
        school,
      });
    }

    for (const p of admissionDocs) {
      const school = toSchool(p.schoolId);
      if (!school) continue;
      results.push({
        id: String(p._id),
        name: p.name,
        cutoff: p.cutoff ?? null,
        source: "partner",
        school,
      });
    }

    results.sort((a, b) => {
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return (a.school?.name || "").localeCompare(b.school?.name || "");
    });

    return NextResponse.json(
      { ok: true, results: results.slice(0, 40) },
      { status: 200 },
    );
  } catch (error) {
    console.error("[programmes/search] GET error", error);
    return NextResponse.json(
      { error: "Failed to search programmes" },
      { status: 500 },
    );
  }
}
