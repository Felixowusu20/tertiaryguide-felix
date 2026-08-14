import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";

interface CheckerPaymentDoc {
  _id?: ObjectId;
  reference: string;
  email: string;
  fullName?: string | null;
  amount: number;
  currency: string;
  status: string;
  quantity: number;
  checkers: { serial: string; pin: string }[];
  paidAt: Date;
  createdAt: Date;
}

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection<CheckerPaymentDoc>("checkerPayments");

    const docs = await collection
      .find({}, { sort: { paidAt: -1 } })
      .limit(200)
      .toArray();

    const payments = docs.map((doc) => ({
      id: String(doc._id),
      reference: doc.reference,
      email: doc.email,
      fullName: doc.fullName ?? null,
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      quantity: doc.quantity || 1,
      issuedCount: (doc.checkers || []).length,
      paidAt: doc.paidAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, payments }, { status: 200 });
  } catch (error) {
    console.error("[admin/checkers/payments] GET error", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 },
    );
  }
}
