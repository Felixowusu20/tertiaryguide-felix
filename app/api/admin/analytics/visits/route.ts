import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import {
  buildLast7DaysSeries,
  peakFromSeries,
  startOfDay,
} from "../../../../../lib/analytics-helpers";

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const visits = db.collection<{
      occurredAt: Date;
      path?: string;
      visitorId?: string;
    }>("visits");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startWindow = startOfDay(sevenDaysAgo);

    const [pageViewsAgg, uniqueAgg, trackedVisitorRows] = await Promise.all([
      visits
        .aggregate<{ _id: string; count: number }>([
          { $match: { occurredAt: { $gte: startWindow } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      visits
        .aggregate<{ count: number }>([
          { $match: { occurredAt: { $gte: startWindow }, visitorId: { $exists: true, $ne: "" } } },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
                },
                visitorId: "$visitorId",
              },
            },
          },
          { $count: "count" },
        ])
        .toArray(),
      visits.countDocuments({
        occurredAt: { $gte: startWindow },
        visitorId: { $exists: true, $ne: "" },
      }),
    ]);

    const countsByDate = new Map(
      pageViewsAgg.map((item) => [item._id, item.count]),
    );
    const visitsByDay = buildLast7DaysSeries(countsByDate);
    const totalVisits7d = visitsByDay.reduce((sum, item) => sum + item.count, 0);
    const uniqueVisitors7d =
      trackedVisitorRows > 0
        ? (uniqueAgg[0]?.count ?? 0)
        : totalVisits7d;
    const avgDailyVisits = Math.round(totalVisits7d / 7);
    const peakDayLabel = peakFromSeries(visitsByDay);

    return NextResponse.json(
      {
        ok: true,
        totalVisits7d,
        uniqueVisitors7d,
        peakDayLabel,
        avgDailyVisits,
        visitsByDay: visitsByDay.map(({ dayLabel, count }) => ({
          dayLabel,
          count,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/analytics/visits] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
