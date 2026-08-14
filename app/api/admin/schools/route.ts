import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import {
  getCachedSchools,
  setCachedSchools,
  invalidateSchoolsCache,
  type CachedSchool,
} from "../../../../lib/redis";
import {
  normalizeSchoolCategories,
  primarySchoolCategory,
  schoolCategoriesFromRequestBody,
} from "../../../../lib/schoolCategories";

interface SchoolDoc {
  _id?: ObjectId;
  name: string;
  alias?: string | null;
  logoSrc?: string | null;
  logoAlt?: string | null;
  priceGhs?: number | null;
  deadline?: Date | null;
  createdAt: Date;
  about?: string | null;
  preRequisite?: string | null;
  durationYears?: number | null;
  isVerified?: boolean;
  /** @deprecated use categories */
  category?: string | null;
  categories?: string[] | null;
}

export async function GET(_req: NextRequest) {
  try {
    const cached = await getCachedSchools();
    if (cached) {
      const schools = cached.map((s) => {
        const categories = normalizeSchoolCategories(
          s.categories ?? (s.category ? [s.category] : null),
          s.category,
        );
        return {
          ...s,
          categories,
          category: primarySchoolCategory(categories),
        };
      });
      return NextResponse.json({ ok: true, schools }, { status: 200 });
    }

    const db = await getDb();
    const schools = db.collection<SchoolDoc>("schools");

    const docs = await schools
      .find({}, { sort: { createdAt: -1 } })
      .limit(200)
      .toArray();

    const items: CachedSchool[] = docs.map((doc) => {
      const categories = normalizeSchoolCategories(
        doc.categories,
        doc.category,
      );
      return {
        id: String(doc._id),
        name: doc.name,
        alias: doc.alias ?? null,
        logoSrc: doc.logoSrc ?? null,
        logoAlt: doc.logoAlt ?? null,
        priceGhs: doc.priceGhs ?? null,
        deadline: doc.deadline ? doc.deadline.toISOString() : null,
        about: doc.about ?? null,
        preRequisite: doc.preRequisite ?? null,
        durationYears: doc.durationYears ?? null,
        isVerified: !!doc.isVerified,
        categories: [...categories],
        category: primarySchoolCategory(categories),
      };
    });

    await setCachedSchools(items);

    return NextResponse.json({ ok: true, schools: items }, { status: 200 });
  } catch (error) {
    console.error("[admin/schools] GET error", error);
    return NextResponse.json(
      { error: "Failed to load schools" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null as unknown as null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const alias = typeof body?.alias === "string" ? body.alias.trim() : "";
    const logoSrc = typeof body?.logoSrc === "string" ? body.logoSrc.trim() : "";
    const logoAlt = typeof body?.logoAlt === "string" ? body.logoAlt.trim() : "";
    const about = typeof body?.about === "string" ? body.about.trim() : "";
    const preRequisite =
      typeof body?.preRequisite === "string" ? body.preRequisite.trim() : "";
    const priceGhsRaw = body?.priceGhs;
    const durationYearsRaw = body?.durationYears;
    const deadlineRaw = typeof body?.deadline === "string" ? body.deadline : "";
    const isVerified = body?.isVerified === true;
    const categories = schoolCategoriesFromRequestBody(body);

    if (!name) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 },
      );
    }

    let priceGhs: number | null = null;
    if (priceGhsRaw !== undefined && priceGhsRaw !== null && priceGhsRaw !== "") {
      const asNumber = Number(priceGhsRaw);
      priceGhs = Number.isFinite(asNumber) && asNumber >= 0 ? asNumber : null;
    }

    let deadline: Date | null = null;
    if (deadlineRaw) {
      const parsed = new Date(deadlineRaw);
      if (!Number.isNaN(parsed.getTime())) {
        deadline = parsed;
      }
    }

    let durationYears: number | null = null;
    if (
      durationYearsRaw !== undefined &&
      durationYearsRaw !== null &&
      durationYearsRaw !== ""
    ) {
      const asNumber = Number(durationYearsRaw);
      durationYears = Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
    }

    const db = await getDb();
    const schools = db.collection<SchoolDoc>("schools");

    await schools.createIndex({ name: 1 }, { unique: false });
    await schools.createIndex({ alias: 1 }, { unique: false, sparse: true });

    const now = new Date();

    const result = await schools.insertOne({
      name,
      alias: alias || null,
      logoSrc: logoSrc || null,
      logoAlt: logoAlt || null,
      priceGhs,
      deadline,
      createdAt: now,
      about: about || null,
      preRequisite: preRequisite || null,
      durationYears,
      isVerified,
      categories: [...categories],
    });

    await invalidateSchoolsCache();

    return NextResponse.json(
      {
        ok: true,
        school: {
          id: result.insertedId.toString(),
          name,
          alias: alias || null,
          logoSrc: logoSrc || null,
          logoAlt: logoAlt || null,
          priceGhs,
          deadline: deadline ? deadline.toISOString() : null,
          about: about || null,
          preRequisite: preRequisite || null,
          durationYears,
          isVerified,
          categories: [...categories],
          category: primarySchoolCategory(categories),
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/schools] POST error", error);
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 },
    );
  }
}
