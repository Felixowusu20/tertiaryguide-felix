"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const pieColors = ["#2563EB", "#10B981", "#F97316"];
const schoolSellingColors = [
  "#007AFF",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
];

const purchaseTypeColors: Record<string, string> = {
  "University vouchers": "#007AFF",
  "WASSCE checkers": "#10B981",
};

function purchaseTypeBarColor(label: string, index: number) {
  return purchaseTypeColors[label] ?? schoolSellingColors[index % schoolSellingColors.length];
}

export function AdminAnalyticsSection() {
  const [activeTab, setActiveTab] = useState<"users" | "visits" | "forms">(
    "forms",
  );

  const [usersLoading, setUsersLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [formsLoading, setFormsLoading] = useState(true);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeThisWeek, setActiveThisWeek] = useState<number | null>(null);
  const [newSignups24h, setNewSignups24h] = useState<number | null>(null);
  const [newSignupsThisWeek, setNewSignupsThisWeek] = useState<number | null>(null);

  const [userRolesPie, setUserRolesPie] = useState<
    { name: string; value: number }[]
  >([]);

  const [signupsData, setSignupsData] = useState<
    { day: string; users: number }[]
  >([]);

  const [totalVisits7d, setTotalVisits7d] = useState<number | null>(null);
  const [uniqueVisitors7d, setUniqueVisitors7d] = useState<number | null>(null);
  const [peakDay, setPeakDay] = useState<string | null>(null);
  const [avgDailyVisits, setAvgDailyVisits] = useState<number | null>(null);
  const [visitsData, setVisitsData] = useState<
    { day: string; visits: number }[]
  >([]);

  const [voucherTotal, setVoucherTotal] = useState<number | null>(null);
  const [voucherIssued, setVoucherIssued] = useState<number | null>(null);
  const [voucherUnissued, setVoucherUnissued] = useState<number | null>(null);
  const [formsByType, setFormsByType] = useState<
    { label: string; count: number }[]
  >([]);
  const [topSellingForms, setTopSellingForms] = useState<
    {
      label: string;
      count: number;
      issued: number;
      unissued: number;
      revenue: number;
    }[]
  >([]);
  const [purchasesData, setPurchasesData] = useState<
    { day: string; purchases: number }[]
  >([]);
  const [sellingSummaryOpen, setSellingSummaryOpen] = useState(false);

  useEffect(() => {
    async function loadUsersAnalytics() {
      try {
        setUsersLoading(true);
        const res = await fetch("/api/admin/analytics/users");
        const data = await res.json();
        if (!res.ok) return;

        setTotalUsers(data.totalUsers ?? null);
        setActiveThisWeek(data.activeThisWeek ?? null);
        setNewSignups24h(data.newSignups24h ?? null);
        setNewSignupsThisWeek(data.newSignupsThisWeek ?? null);

        if (Array.isArray(data.rolesPie)) {
          setUserRolesPie(data.rolesPie);
        }
        if (Array.isArray(data.signupsByDay)) {
          setSignupsData(
            data.signupsByDay.map((item: { dayLabel: string; count: number }) => ({
              day: item.dayLabel,
              users: item.count,
            })),
          );
        }
      } catch {
        // keep defaults
      } finally {
        setUsersLoading(false);
      }
    }

    async function loadVisitsAnalytics() {
      try {
        setVisitsLoading(true);
        const res = await fetch("/api/admin/analytics/visits");
        const data = await res.json();
        if (!res.ok) return;

        setTotalVisits7d(data.totalVisits7d ?? null);
        setUniqueVisitors7d(data.uniqueVisitors7d ?? null);
        setPeakDay(data.peakDayLabel ?? null);
        setAvgDailyVisits(data.avgDailyVisits ?? null);

        if (Array.isArray(data.visitsByDay)) {
          setVisitsData(
            data.visitsByDay.map((item: { dayLabel: string; count: number }) => ({
              day: item.dayLabel,
              visits: item.count,
            })),
          );
        }
      } catch {
        // keep defaults
      } finally {
        setVisitsLoading(false);
      }
    }

    async function loadFormsAnalytics() {
      try {
        setFormsLoading(true);
        const res = await fetch("/api/admin/analytics/forms");
        const data = await res.json();
        if (!res.ok) return;

        setVoucherTotal(data.voucherTotal ?? null);
        setVoucherIssued(data.voucherIssued ?? null);
        setVoucherUnissued(data.voucherUnissued ?? null);

        if (Array.isArray(data.formsByType)) {
          setFormsByType(data.formsByType);
        }
        if (Array.isArray(data.topSellingForms)) {
          setTopSellingForms(data.topSellingForms);
        }
        if (Array.isArray(data.purchasesByDay)) {
          setPurchasesData(
            data.purchasesByDay.map((item: { dayLabel: string; count: number }) => ({
              day: item.dayLabel,
              purchases: item.count,
            })),
          );
        }
      } catch {
        // keep defaults
      } finally {
        setFormsLoading(false);
      }
    }

    loadUsersAnalytics();
    loadVisitsAnalytics();
    loadFormsAnalytics();
  }, []);

  const tabClass = (tab: typeof activeTab) =>
    `shrink-0 whitespace-nowrap pb-2 ${
      activeTab === tab
        ? "border-b-2 border-[#007AFF] text-[#007AFF]"
        : "text-[#6B7280] hover:text-[#007AFF]"
    }`;

  const metricCard = (
    label: string,
    value: number | string | null,
    hint: string,
    tone?: "default" | "success" | "danger",
  ) => {
    const valueClass =
      tone === "success"
        ? "text-[#16A34A]"
        : tone === "danger"
          ? "text-[#DC2626]"
          : "text-[#111827]";

    return (
      <div className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-[#7C93B0]">
          {label}
        </p>
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${valueClass}`}>
          {value ?? "—"}
        </p>
        <p className="mt-1 text-xs text-[#5B6B7F]">{hint}</p>
      </div>
    );
  };

  return (
    <>
      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Analytics</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
          Analytics
        </h1>
        <p className="text-sm text-[#6B7280]">
          Live metrics for users, traffic, voucher orders, and checker purchases.
        </p>
      </section>

      <section className="mt-6 flex min-w-0 items-center gap-3 overflow-x-auto border-b border-[#DBEAFE] pb-px text-xs font-medium sm:gap-6 sm:text-sm">
        <button type="button" onClick={() => setActiveTab("users")} className={tabClass("users")}>
          Users
        </button>
        <button type="button" onClick={() => setActiveTab("visits")} className={tabClass("visits")}>
          Visits
        </button>
        <button type="button" onClick={() => setActiveTab("forms")} className={tabClass("forms")}>
          Purchases / Forms
        </button>
      </section>

      {activeTab === "users" && (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCard("Total users", usersLoading ? "..." : totalUsers, "Registered student & advisor accounts")}
            {metricCard("Active this week", usersLoading ? "..." : activeThisWeek, "Logged in during the last 7 days")}
            {metricCard("New signups (24h)", usersLoading ? "..." : newSignups24h, "Accounts created today")}
            {metricCard("New signups (7d)", usersLoading ? "..." : newSignupsThisWeek, "Accounts created this week")}
          </section>

          <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">Users by role</h2>
                <p className="text-xs text-[#6B7280]">All accounts</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userRolesPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {userRolesPie.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">New users per day</h2>
                <p className="text-xs text-[#6B7280]">Last 7 days</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} tickMargin={6} allowDecimals={false} />
                    <Tooltip cursor={{ stroke: "#BFDBFE", strokeWidth: 1 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, strokeWidth: 1, stroke: "white" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

        </>
      )}

      {activeTab === "visits" && (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCard("Page views (7d)", visitsLoading ? "..." : totalVisits7d, "Tracked page loads across the public site")}
            {metricCard("Unique visitors (7d)", visitsLoading ? "..." : uniqueVisitors7d, "Distinct visitors in the last 7 days")}
            {metricCard("Peak day", visitsLoading ? "..." : peakDay, "Day with the highest traffic")}
            {metricCard("Avg. daily views", visitsLoading ? "..." : avgDailyVisits, "Average page views per day")}
          </section>

          <section className="mt-8">
            <article className="rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">Visits per day</h2>
                <p className="text-xs text-[#6B7280]">Last 7 days</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} tickMargin={6} allowDecimals={false} />
                    <Tooltip cursor={{ stroke: "#BFDBFE", strokeWidth: 1 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="visits" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, strokeWidth: 1, stroke: "white" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
        </>
      )}

      {activeTab === "forms" && (
        <>
          <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metricCard("Total voucher orders", formsLoading ? "..." : voucherTotal, "Matches the overview dashboard voucher total")}
            {metricCard("Issued vouchers", formsLoading ? "..." : voucherIssued, "Orders already fulfilled with voucher codes", "success")}
            {metricCard("Unissued vouchers", formsLoading ? "..." : voucherUnissued, "Paid orders still waiting for voucher codes", "danger")}
          </section>

          <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] p-4 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">Purchases by type</h2>
                <p className="text-xs text-[#6B7280]">All time snapshot</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formsByType} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#9CA3AF" tickLine={false} interval={0} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tickLine={false} tickMargin={6} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {formsByType.map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={purchaseTypeBarColor(entry.label, index)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] p-4 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">All purchases per day</h2>
                <p className="text-xs text-[#6B7280]">Last 7 days</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={purchasesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} tickMargin={6} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="purchases" stroke="#10B981" strokeWidth={2} dot={{ r: 3, strokeWidth: 1, stroke: "white" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.92fr)]">
            <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827]">
                    Top-selling university forms
                  </h2>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Individual schools shown with separate colors.
                  </p>
                </div>
                <p className="text-xs text-[#6B7280]">Top {topSellingForms.length || 0}</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSellingForms}
                    layout="vertical"
                    margin={{ top: 2, right: 10, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={78}
                      stroke="#9CA3AF"
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(value, name) => [
                        value,
                        name === "count" ? "Orders sold" : name,
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {topSellingForms.map((form, index) => (
                        <Cell
                          key={`${form.label}-${index}`}
                          fill={schoolSellingColors[index % schoolSellingColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-3xl border border-[#DBEAFE] bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setSellingSummaryOpen((open) => !open)}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={sellingSummaryOpen}
                aria-controls="selling-forms-summary-panel"
              >
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[#111827]">
                    Selling forms summary
                  </h2>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    {formsLoading
                      ? "Loading school sales..."
                      : topSellingForms.length === 0
                        ? "No university form sales yet."
                        : sellingSummaryOpen
                          ? "School-by-school orders, fulfilment, and revenue."
                          : `${topSellingForms.length} school${topSellingForms.length === 1 ? "" : "s"} · Top: ${topSellingForms[0]?.label ?? "—"} (${topSellingForms[0]?.count ?? 0} sold)`}
                  </p>
                </div>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#DBEAFE] bg-[#F8FBFF] text-[#007AFF]">
                  {sellingSummaryOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                </span>
              </button>

              {sellingSummaryOpen && (
                <div
                  id="selling-forms-summary-panel"
                  className="mt-3 max-h-[min(420px,55vh)] space-y-2.5 overflow-y-auto pr-0.5"
                >
                  {formsLoading ? (
                    <p className="text-xs text-[#6B7280]">Loading selling forms...</p>
                  ) : topSellingForms.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">
                      No university form sales recorded yet.
                    </p>
                  ) : (
                    topSellingForms.map((form, index) => (
                      <div
                        key={form.label}
                        className="rounded-2xl border border-[#E5EFFD] bg-[#F8FBFF] px-3.5 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="text-[11px] font-semibold uppercase tracking-wide"
                              style={{
                                color:
                                  schoolSellingColors[index % schoolSellingColors.length],
                              }}
                            >
                              #{index + 1}
                            </p>
                            <p
                              className="mt-0.5 truncate text-[13px] font-semibold text-[#111827]"
                              title={form.label}
                            >
                              {form.label}
                            </p>
                          </div>
                          <p
                            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                            style={{
                              backgroundColor:
                                schoolSellingColors[index % schoolSellingColors.length],
                            }}
                          >
                            {form.count} sold
                          </p>
                        </div>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <p className="text-[#9CA3AF]">Issued</p>
                            <p className="font-semibold text-[#166534]">{form.issued}</p>
                          </div>
                          <div>
                            <p className="text-[#9CA3AF]">Unissued</p>
                            <p className="font-semibold text-[#B91C1C]">{form.unissued}</p>
                          </div>
                          <div>
                            <p className="text-[#9CA3AF]">Revenue</p>
                            <p className="font-semibold text-[#111827]">
                              GHS {form.revenue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </>
  );
}
