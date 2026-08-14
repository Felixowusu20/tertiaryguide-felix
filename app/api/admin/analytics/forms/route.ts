import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import {
  buildLast7DaysSeries,
  startOfDay,
} from "../../../../../lib/analytics-helpers";

type VoucherPaymentDoc = {
  schoolId?: ObjectId | string | null;
  amount?: number;
  voucher?: { serial: string; pin: string } | null;
};

type SchoolDoc = {
  _id?: ObjectId;
  name?: string;
  alias?: string | null;
};

function toObjectId(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
}

function schoolDisplayName(school: SchoolDoc | undefined, fallback: string) {
  const alias = school?.alias?.replace(/\s+/g, " ").trim();
  if (alias) return alias;

  const name = school?.name?.replace(/\s+/g, " ").trim();
  if (name) return name;

  return fallback;
}

export async function GET() {
  try {
    const db = await getDb();
    const voucherPayments = db.collection<VoucherPaymentDoc>("voucherPayments");
    const checkerPayments = db.collection("checkerPayments");
    const schools = db.collection<SchoolDoc>("schools");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startWindow = startOfDay(sevenDaysAgo);

    const [
      voucherTotal,
      voucherIssued,
      voucherUnissued,
      checkerTotal,
      checkerPurchasesByDay,
      voucherPurchasesByDay,
      voucherDocs,
    ] = await Promise.all([
      voucherPayments.countDocuments({}),
      voucherPayments.countDocuments({ voucher: { $ne: null } }),
      voucherPayments.countDocuments({
        $or: [{ voucher: null }, { voucher: { $exists: false } }],
      }),
      checkerPayments.countDocuments({}),
      checkerPayments
        .aggregate<{ _id: string; count: number }>([
          { $match: { paidAt: { $gte: startWindow } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      voucherPayments
        .aggregate<{ _id: string; count: number }>([
          { $match: { paidAt: { $gte: startWindow } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      voucherPayments
        .find(
          {},
          {
            projection: {
              schoolId: 1,
              amount: 1,
              voucher: 1,
            },
          },
        )
        .toArray(),
    ]);

    const schoolIds: ObjectId[] = [];
    const seenSchoolIds = new Set<string>();
    for (const doc of voucherDocs) {
      const schoolId = toObjectId(doc.schoolId);
      if (!schoolId) continue;

      const key = schoolId.toHexString();
      if (seenSchoolIds.has(key)) continue;

      seenSchoolIds.add(key);
      schoolIds.push(schoolId);
    }

    const schoolDocs =
      schoolIds.length > 0
        ? await schools.find({ _id: { $in: schoolIds } }).toArray()
        : [];
    const schoolById = new Map<string, SchoolDoc>(
      schoolDocs
        .filter((school) => school._id)
        .map((school) => [school._id!.toHexString(), school]),
    );

    const salesBySchool = new Map<
      string,
      {
        label: string;
        count: number;
        issued: number;
        unissued: number;
        revenue: number;
      }
    >();

    for (const doc of voucherDocs) {
      const schoolId = toObjectId(doc.schoolId);
      const key = schoolId?.toHexString() ?? "unknown";
      const current =
        salesBySchool.get(key) ??
        {
          label: schoolDisplayName(
            schoolId ? schoolById.get(schoolId.toHexString()) : undefined,
            "Unknown school",
          ),
          count: 0,
          issued: 0,
          unissued: 0,
          revenue: 0,
        };

      current.count += 1;
      current.revenue += typeof doc.amount === "number" ? doc.amount / 100 : 0;
      if (doc.voucher) {
        current.issued += 1;
      } else {
        current.unissued += 1;
      }

      salesBySchool.set(key, current);
    }

    const topSellingForms = Array.from(salesBySchool.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 8)
      .map((item) => ({
        ...item,
        revenue: Number(item.revenue.toFixed(2)),
      }));

    const totalForms = voucherTotal + checkerTotal;
    const served = voucherIssued + checkerTotal;
    const unserved = voucherUnissued;

    const purchasesByDayMap = new Map<string, number>();
    for (const item of voucherPurchasesByDay) {
      purchasesByDayMap.set(
        item._id,
        (purchasesByDayMap.get(item._id) ?? 0) + item.count,
      );
    }
    for (const item of checkerPurchasesByDay) {
      purchasesByDayMap.set(
        item._id,
        (purchasesByDayMap.get(item._id) ?? 0) + item.count,
      );
    }

    const purchasesByDay = buildLast7DaysSeries(purchasesByDayMap);

    return NextResponse.json(
      {
        ok: true,
        totalForms,
        served,
        unserved,
        voucherTotal,
        voucherIssued,
        voucherUnissued,
        checkerTotal,
        formsByType: [
          { label: "University vouchers", count: voucherTotal },
          { label: "WASSCE checkers", count: checkerTotal },
        ],
        topSellingForms,
        purchasesByDay: purchasesByDay.map(({ dayLabel, count }) => ({
          dayLabel,
          count,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/analytics/forms] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
