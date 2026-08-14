import { ObjectId, type Db } from "mongodb";
import { findSchoolById, schoolsCollection } from "./admissions/schools";

/** All partner ("secured") school IDs. */
export async function getPartnerSchoolIds(db: Db): Promise<string[]> {
  const schools = await schoolsCollection(db)
    .find({ isPartner: true }, { projection: { _id: 1 } })
    .toArray();

  return schools
    .map((school) => (school._id ? String(school._id) : ""))
    .filter(Boolean);
}

/** Partner schools opted in at the school level (legacy / bulk). */
export async function getSchoolLevelFeaturedPartnerIds(
  db: Db,
): Promise<string[]> {
  const schools = await schoolsCollection(db)
    .find(
      { isPartner: true, showBlogOnMain: true },
      { projection: { _id: 1 } },
    )
    .toArray();

  return schools
    .map((school) => (school._id ? String(school._id) : ""))
    .filter(Boolean);
}

export async function isPartnerSchoolId(
  db: Db,
  schoolId: string,
): Promise<boolean> {
  if (!schoolId || !ObjectId.isValid(schoolId)) return false;
  const school = await findSchoolById(db, schoolId);
  return school?.isPartner === true;
}

/**
 * Public blog listings (homepage + main /blog):
 * - Platform posts (no schoolId) always included
 * - Non-partner school posts included
 * - Partner school posts included when showOnHomepage is true on the post,
 *   or the school has showBlogOnMain enabled
 *
 * School-filtered views (`/blog?schoolId=`) should NOT use this helper.
 */
export async function publicBlogPostFilter(
  db: Db,
  base: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const partnerIds = await getPartnerSchoolIds(db);
  if (partnerIds.length === 0) return base;

  const schoolFeaturedIds = await getSchoolLevelFeaturedPartnerIds(db);

  return {
    ...base,
    $and: [
      ...(Array.isArray(base.$and) ? base.$and : []),
      {
        $or: [
          { schoolId: { $exists: false } },
          { schoolId: null },
          { schoolId: "" },
          { schoolId: { $nin: partnerIds } },
          { showOnHomepage: true },
          ...(schoolFeaturedIds.length > 0
            ? [{ schoolId: { $in: schoolFeaturedIds } }]
            : []),
        ],
      },
    ],
  };
}
