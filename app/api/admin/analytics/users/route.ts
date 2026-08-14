import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import {
  buildLast7DaysSeries,
  startOfDay,
} from "../../../../../lib/analytics-helpers";
import { nonStaffUserFilter } from "../../../../../lib/admin-access";

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const users = db.collection("users");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startWindow = startOfDay(sevenDaysAgo);

    const nonAdminFilter = nonStaffUserFilter();

    const [
      totalUsers,
      activeThisWeek,
      newSignups24h,
      newSignupsThisWeek,
      adminCount,
      superadminCount,
      advisorCount,
      signupsAgg,
    ] = await Promise.all([
      users.countDocuments(nonAdminFilter),
      users.countDocuments({
        ...nonAdminFilter,
        lastLoginAt: { $gte: sevenDaysAgo },
      }),
      users.countDocuments({
        ...nonAdminFilter,
        createdAt: { $gte: oneDayAgo },
      }),
      users.countDocuments({
        ...nonAdminFilter,
        createdAt: { $gte: sevenDaysAgo },
      }),
      users.countDocuments({ role: "admin" }),
      users.countDocuments({ role: "superadmin" }),
      users.countDocuments({ role: "advisor" }),
      users
        .aggregate<{ _id: string; count: number }>([
          {
            $match: {
              ...nonAdminFilter,
              createdAt: { $gte: startWindow },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const studentCount = Math.max(totalUsers - advisorCount, 0);
    const signupsByDay = buildLast7DaysSeries(
      new Map(signupsAgg.map((item) => [item._id, item.count])),
    );

    return NextResponse.json(
      {
        ok: true,
        totalUsers,
        activeThisWeek,
        newSignups24h,
        newSignupsThisWeek,
        rolesPie: [
          { name: "Students", value: studentCount },
          { name: "Advisors", value: advisorCount },
          { name: "Admins", value: adminCount + superadminCount },
        ],
        signupsByDay: signupsByDay.map(({ dayLabel, count }) => ({
          dayLabel,
          count,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/analytics/users] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
