import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { requireStaff } from "../../../../lib/admin-access";
import {
  applicationsCollection,
  ensureApplicationIndexes,
  serializeApplication,
} from "../../../../lib/admissions/applications";
import { schoolsCollection } from "../../../../lib/admissions/schools";

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    await ensureApplicationIndexes(db);

    const docs = await applicationsCollection(db)
      .find({})
      .sort({ submittedAt: -1 })
      .limit(500)
      .toArray();

    const schoolObjectIds = [
      ...new Map(
        docs
          .map((doc) => doc.schoolId)
          .filter((id): id is ObjectId => Boolean(id))
          .map((id) => [String(id), id instanceof ObjectId ? id : new ObjectId(String(id))]),
      ).values(),
    ];

    const schoolDocs =
      schoolObjectIds.length > 0
        ? await schoolsCollection(db)
            .find({ _id: { $in: schoolObjectIds } })
            .toArray()
        : [];

    const schoolMap = Object.fromEntries(
      schoolDocs.map((school) => [
        String(school._id),
        { name: school.name, slug: school.slug ?? null },
      ]),
    );

    const applications = docs.map((doc) => {
      const serialized = serializeApplication(doc);
      const school = schoolMap[serialized.schoolId] || {
        name: "Unknown school",
        slug: null,
      };
      return {
        ...serialized,
        schoolName: school.name,
        schoolSlug: school.slug,
      };
    });

    return NextResponse.json({ ok: true, applications });
  } catch (error) {
    console.error("[admin/applications] GET", error);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 },
    );
  }
}
