import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import { admissionPaymentsCollection } from "../../../../../lib/admissions/vouchers";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const docs = await admissionPaymentsCollection(db)
      .find({ schoolId: auth.schoolId })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      ok: true,
      transactions: docs.map((d) => ({
        id: String(d._id),
        reference: d.reference,
        email: d.email,
        fullName: d.fullName ?? null,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        product: d.product,
        programmeLevel: d.programmeLevel ?? "undergraduate",
        voucherId: d.voucherId ? String(d.voucherId) : null,
        paidAt: d.paidAt ? d.paidAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[school-portal/transactions]", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
