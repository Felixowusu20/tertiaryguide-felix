import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import {
  normalizeSchoolCategories,
  primarySchoolCategory,
} from "../../../../lib/schoolCategories";

interface SchoolDoc {
  _id?: ObjectId;
  name: string;
  alias?: string | null;
  logoSrc?: string | null;
  logoAlt?: string | null;
  priceGhs?: number | null;
  voucherPrice?: number | null;
  undergraduateVoucherPrice?: number | null;
  postgraduateVoucherPrice?: number | null;
  deadline?: Date | null;
  createdAt: Date;
  about?: string | null;
  preRequisite?: string | null;
  durationYears?: number | null;
  isVerified?: boolean;
  category?: string | null;
  categories?: string[] | null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const db = await getDb();
    const schools = db.collection<SchoolDoc>("schools");

    const doc = await schools.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const categories = normalizeSchoolCategories(
      doc.categories,
      doc.category,
    );

    return NextResponse.json(
      {
        ok: true,
        school: {
          id: String(doc._id),
          name: doc.name,
          alias: doc.alias ?? null,
          logoSrc: doc.logoSrc ?? null,
          logoAlt: doc.logoAlt ?? null,
          priceGhs: doc.priceGhs ?? null,
          voucherPrice: doc.voucherPrice ?? null,
          undergraduateVoucherPrice: doc.undergraduateVoucherPrice ?? null,
          postgraduateVoucherPrice: doc.postgraduateVoucherPrice ?? null,
          deadline: doc.deadline ? doc.deadline.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
          about: doc.about ?? null,
          preRequisite: doc.preRequisite ?? null,
          durationYears: doc.durationYears ?? null,
          isVerified: !!doc.isVerified,
          categories,
          category: primarySchoolCategory(categories),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[schools/[id]] GET error", error);
    return NextResponse.json(
      { error: "Failed to load school" },
      { status: 500 },
    );
  }
}
