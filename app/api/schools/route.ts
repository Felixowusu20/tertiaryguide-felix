import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";
import { type CachedSchool } from "../../../lib/redis";
import {
  normalizeSchoolCategories,
  primarySchoolCategory,
} from "../../../lib/schoolCategories";

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
  category?: string | null;
  categories?: string[] | null;
}

export async function GET(_req: NextRequest) {
  try {
    // Public voucher catalog excludes partner/secured admissions schools
    // (those appear via /api/apply/schools and the homepage section).
    const db = await getDb();
    const schools = db.collection<SchoolDoc>("schools");

    const docs = await schools
      .find({ isPartner: { $ne: true } }, { sort: { createdAt: -1 } })
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

    return NextResponse.json({ ok: true, schools: items }, { status: 200 });
  } catch (error) {
    console.error("[schools] GET error", error);
    return NextResponse.json(
      { error: "Failed to load schools" },
      { status: 500 },
    );
  }
}
