import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const apps = db.collection("applications");
    const payments = db.collection("admissionPayments");

    const [byDay, byMonth, byStatus] = await Promise.all([
      apps
        .aggregate([
          { $match: { schoolId: auth.schoolId } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 60 },
        ])
        .toArray(),
      apps
        .aggregate([
          { $match: { schoolId: auth.schoolId } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$submittedAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 24 },
        ])
        .toArray(),
      apps
        .aggregate([
          { $match: { schoolId: auth.schoolId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const revenueByMonth = await payments
      .aggregate([
        { $match: { schoolId: auth.schoolId, status: "success" } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$paidAt" },
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 24 },
      ])
      .toArray();

    return NextResponse.json({
      ok: true,
      applicationsPerDay: byDay.map((r) => ({ date: r._id, count: r.count })),
      applicationsPerMonth: byMonth.map((r) => ({ month: r._id, count: r.count })),
      applicationsByStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
      revenuePerMonth: revenueByMonth.map((r) => ({
        month: r._id,
        total: r.total,
        count: r.count,
      })),
    });
  } catch (error) {
    console.error("[school-portal/analytics]", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
