"use client";

import React, { useMemo } from "react";
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brandChartColors, normalizeBrandColor } from "@/lib/brand-theme";

type AnalyticsData = {
  applicationsPerDay: { date: string; count: number }[];
  applicationsPerMonth: { month: string; count: number }[];
  applicationsByStatus: { status: string; count: number }[];
  revenuePerMonth: { month: string; total: number; count: number }[];
};

type Props = {
  analytics: AnalyticsData;
  brandColor: string;
};

const STATUS_FALLBACK: Record<string, string> = {
  Pending: "#F59E0B",
  "Under Review": "#0369A1",
  Approved: "#10B981",
  Rejected: "#EF4444",
  Admitted: "#7C3AED",
};

export function AnalyticsSection({ analytics, brandColor }: Props) {
  const brand = normalizeBrandColor(brandColor);
  const palette = brandChartColors(brand);

  const statusData = useMemo(
    () =>
      analytics.applicationsByStatus.map((s, i) => ({
        name: s.status || "Unknown",
        value: s.count,
        fill: STATUS_FALLBACK[s.status] || palette[i % palette.length],
      })),
    [analytics.applicationsByStatus, palette],
  );

  const dayData = useMemo(
    () =>
      analytics.applicationsPerDay.slice(-21).map((d) => ({
        date: d.date?.slice(5) || d.date,
        applications: d.count,
      })),
    [analytics.applicationsPerDay],
  );

  const monthData = useMemo(
    () =>
      analytics.applicationsPerMonth.slice(-12).map((m) => ({
        month: m.month,
        applications: m.count,
      })),
    [analytics.applicationsPerMonth],
  );

  const revenueData = useMemo(
    () =>
      analytics.revenuePerMonth.slice(-12).map((r) => ({
        month: r.month,
        revenue: r.total,
        sales: r.count,
      })),
    [analytics.revenuePerMonth],
  );

  const empty =
    statusData.length === 0 &&
    dayData.length === 0 &&
    revenueData.length === 0;

  if (empty) {
    return (
      <section className="rounded-3xl border border-[#E5E7EB] bg-white px-6 py-14 text-center shadow-sm">
        <Activity className="mx-auto h-8 w-8 text-[var(--school-brand)]" />
        <p className="mt-3 text-sm font-medium text-[#111827]">No analytics yet</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Charts will appear once applications and voucher sales start coming in.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-3xl border border-[var(--school-brand-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
            <PieIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-[#111827]">Applications by status</h3>
            <p className="text-xs text-[#6B7280]">Distribution of current pipeline</p>
          </div>
        </div>
        {statusData.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#6B7280]">No status data yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-[var(--school-brand-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
            <CircleDollarSign className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-[#111827]">Revenue by month</h3>
            <p className="text-xs text-[#6B7280]">Successful voucher payments</p>
          </div>
        </div>
        {revenueData.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#6B7280]">No revenue yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`GHS ${value}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill={brand} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-[var(--school-brand-border)] bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-[#111827]">
              Applications per day
            </h3>
            <p className="text-xs text-[#6B7280]">Last 21 days with activity</p>
          </div>
        </div>
        {dayData.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#6B7280]">
            No daily application data yet.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dayData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke={brand}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: brand }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      {monthData.length > 0 && (
        <article className="rounded-3xl border border-[var(--school-brand-border)] bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold text-[#111827]">
                Applications per month
              </h3>
              <p className="text-xs text-[#6B7280]">Monthly submission volume</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="applications"
                  fill={palette[1] || brand}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      )}
    </section>
  );
}
