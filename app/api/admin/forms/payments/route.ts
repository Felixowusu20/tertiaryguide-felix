import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

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

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();

    const voucherPaymentsCol = db.collection<VoucherPaymentDoc>(
      "voucherPayments",
    );

    const payments = await voucherPaymentsCol
      .aggregate<
        VoucherPaymentDoc & {
          school?: SchoolDoc | null;
        }
      >([
        { $sort: { paidAt: -1 } },
        { $limit: 300 },
        {
          $lookup: {
            from: "schools",
            localField: "schoolId",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $unwind: {
            path: "$school",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    const items = payments.map((doc) => {
      const schoolName =
        (doc as any).school?.alias || (doc as any).school?.name || "Unknown";

      return {
        id: String(doc._id),
        reference: doc.reference,
        email: doc.email,
        fullName: doc.fullName ?? null,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status,
        school: schoolName,
        paidAt: doc.paidAt.toISOString(),
        /** true while voucher not yet issued (out of stock / queued) */
        voucherPending: doc.voucher == null,
      };
    });

    return NextResponse.json(
      { ok: true, payments: items },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/forms/payments] GET error", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 },
    );
  }
}
