import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

interface VoucherPaymentDoc {
  _id?: import("mongodb").ObjectId;
  reference: string;
  email: string;
  fullName?: string | null;
  amount: number; // in pesewas
  currency: string;
  status: string;
  schoolId: import("mongodb").ObjectId;
  voucher: { serial: string; pin: string } | null;
  paidAt: Date;
  createdAt: Date;
}

interface SchoolDoc {
  _id?: import("mongodb").ObjectId;
  name: string;
  alias?: string | null;
}

function toObjectId(sid: unknown): ObjectId | null {
  if (sid == null) return null;
  if (sid instanceof ObjectId) return sid;
  if (typeof sid === "string" && ObjectId.isValid(sid)) return new ObjectId(sid);
  return null;
}

function pickSchoolDisplayName(s: SchoolDoc | undefined): string {
  if (!s) return "Unknown";
  const alias = typeof s.alias === "string" ? s.alias.replace(/\s+/g, " ").trim() : "";
  const name = typeof s.name === "string" ? s.name.replace(/\s+/g, " ").trim() : "";
  if (alias.length > 0) return alias;
  if (name.length > 0) return name;
  return "Unknown";
}

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();

    const voucherPaymentsCol = db.collection<VoucherPaymentDoc>(
      "voucherPayments",
    );
    const schoolsCol = db.collection<SchoolDoc>("schools");

    // Same pattern as /api/user/purchases: batch-resolve schools by id so
    // $lookup type mismatches (e.g. string vs ObjectId in older rows) do not
    // leave school names empty.
    const voucherDocs = await voucherPaymentsCol
      .find({})
      .sort({ paidAt: -1 })
      .limit(200)
      .toArray();

    const uniqueOids: ObjectId[] = [];
    const seen = new Set<string>();
    for (const p of voucherDocs) {
      const oid = toObjectId(p.schoolId as unknown);
      if (oid) {
        const h = oid.toString();
        if (!seen.has(h)) {
          seen.add(h);
          uniqueOids.push(oid);
        }
      }
    }

    const schoolDocs =
      uniqueOids.length > 0
        ? await schoolsCol.find({ _id: { $in: uniqueOids } }).toArray()
        : [];

    const schoolById = new Map<string, SchoolDoc>(
      schoolDocs.map((s) => [s._id!.toString(), s]),
    );

    const items = voucherDocs
      .map((doc) => {
        const sid = toObjectId(doc.schoolId as unknown);
        const school = sid ? schoolById.get(sid.toString()) : undefined;
        const schoolName = pickSchoolDisplayName(school);
        const voucherStatus = doc.voucher ? "Issued" : "Unissued";

        return {
          id: String(doc._id),
          name: doc.fullName || doc.email,
          email: doc.email,
          reference: doc.reference,
          type: "Voucher" as const,
          school: schoolName,
          status: voucherStatus as "Issued" | "Unissued",
          price: `${doc.currency} ${(doc.amount / 100).toFixed(2)}`,
          date: doc.paidAt.toISOString(),
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return NextResponse.json({ ok: true, forms: items }, { status: 200 });
  } catch (error) {
    console.error("[admin/forms] GET error", error);
    return NextResponse.json(
      { error: "Failed to load forms" },
      { status: 500 },
    );
  }
}
