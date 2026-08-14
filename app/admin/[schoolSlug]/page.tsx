"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  LayoutDashboard,
  Loader2,
  LogOut,
  Newspaper,
  Search,
  Settings,
  Ticket,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { adminFetch, getAdminRole } from "@/lib/admin-client";
import {
  brandThemeStyle,
  DEFAULT_BRAND_COLOR,
  formatSchoolDeadline,
  normalizeBrandColors,
  brandGradient,
  blendBrandColors,
} from "@/lib/brand-theme";
import { isDeadlineCalendarExpired } from "@/lib/deadlines";
import { ProgrammesSection } from "./ProgrammesSection";
import { BlogSection } from "./BlogSection";
import { SettingsSection } from "./SettingsSection";
import { AnalyticsSection } from "./AnalyticsSection";

type Tab =
  | "dashboard"
  | "applicants"
  | "programmes"
  | "blog"
  | "transactions"
  | "analytics"
  | "settings";

type Metrics = {
  totalApplications: number;
  applicationsToday: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  underReviewApplications: number;
  admittedApplications: number;
  totalRevenue: number;
  totalVouchersSold: number;
};

type ApplicationRow = {
  id: string;
  applicationNumber: string;
  fullName: string;
  phone: string | null;
  email: string;
  programme: string | null;
  status: string;
  submittedAt: string;
  personalInfo?: Record<string, unknown>;
  guardianInfo?: Record<string, unknown> | null;
  programmeChoices?: Record<string, unknown> | null;
  results?: { subject: string; grade: string }[];
  documents?: Record<string, string | undefined> | null;
};

type Transaction = {
  id: string;
  reference: string;
  email: string;
  fullName: string | null;
  amount: number;
  status: string;
  product: string;
  programmeLevel?: string;
  paidAt: string | null;
};

export default function SchoolAdminPortalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
        </main>
      }
    >
      <SchoolAdminPortalContent />
    </Suspense>
  );
}

function SchoolAdminPortalContent() {
  const params = useParams<{ schoolSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.schoolSlug;

  const initialTab = (searchParams.get("tab") as Tab) || "dashboard";
  const [tab, setTab] = useState<Tab>(
    [
      "dashboard",
      "applicants",
      "programmes",
      "blog",
      "transactions",
      "analytics",
      "settings",
    ].includes(initialTab)
      ? initialTab
      : "dashboard",
  );
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAlias, setSchoolAlias] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolDeadline, setSchoolDeadline] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const [brandColors, setBrandColors] = useState<string[]>([DEFAULT_BRAND_COLOR]);
  const [voucherPrice, setVoucherPrice] = useState<number | null>(null);
  const [undergraduateVoucherPrice, setUndergraduateVoucherPrice] = useState<
    number | null
  >(null);
  const [postgraduateVoucherPrice, setPostgraduateVoucherPrice] = useState<
    number | null
  >(null);
  const [schoolDescription, setSchoolDescription] = useState<string | null>(
    null,
  );
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<{
    applicationsPerDay: { date: string; count: number }[];
    applicationsPerMonth: { month: string; count: number }[];
    applicationsByStatus: { status: string; count: number }[];
    revenuePerMonth: { month: string; total: number; count: number }[];
  } | null>(null);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actorLabel, setActorLabel] = useState("");

  useEffect(() => {
    const role = getAdminRole();
    const username =
      typeof window !== "undefined"
        ? window.localStorage.getItem("tg_admin_username")
        : null;
    if (!username || !role) {
      router.replace("/admin/signin");
      return;
    }
    if (role === "school_admin") {
      const ownSlug = window.localStorage.getItem("tg_school_slug");
      if (ownSlug && ownSlug !== slug) {
        router.replace(`/admin/${ownSlug}`);
        return;
      }
    }
    setCheckingAuth(false);
  }, [router, slug]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/school-portal/${slug}/metrics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load portal");
      setSchoolName(data.school?.name || slug);
      setSchoolAlias(data.school?.alias || null);
      setSchoolLogo(data.school?.logoSrc || null);
      setSchoolId(
        typeof data.school?.id === "string"
          ? data.school.id
          : window.localStorage.getItem("tg_school_id"),
      );
      setSchoolDeadline(data.school?.deadline ?? null);
      const nextColors = normalizeBrandColors(
        data.school?.brandColors,
        data.school?.brandColor,
      );
      setBrandColors(nextColors);
      setBrandColor(blendBrandColors(nextColors));
      setVoucherPrice(
        typeof data.school?.voucherPrice === "number"
          ? data.school.voucherPrice
          : null,
      );
      setUndergraduateVoucherPrice(
        typeof data.school?.undergraduateVoucherPrice === "number"
          ? data.school.undergraduateVoucherPrice
          : typeof data.school?.voucherPrice === "number"
            ? data.school.voucherPrice
            : null,
      );
      setPostgraduateVoucherPrice(
        typeof data.school?.postgraduateVoucherPrice === "number"
          ? data.school.postgraduateVoucherPrice
          : null,
      );
      setSchoolDescription(data.school?.description ?? null);
      setMetrics(data.metrics);
      setActorLabel(
        data.actor?.kind === "staff"
          ? `${data.actor.username} (platform)`
          : data.actor?.username || "",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (query) params.set("q", query);
      const res = await adminFetch(
        `/api/school-portal/${slug}/applications?${params.toString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load applicants");
      setApplications(data.applications || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applicants");
    } finally {
      setLoading(false);
    }
  }, [slug, statusFilter, query]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/school-portal/${slug}/transactions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load transactions");
      setTransactions(data.transactions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/school-portal/${slug}/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics");
      setAnalytics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (checkingAuth) return;
    void loadDashboard();
  }, [checkingAuth, loadDashboard]);

  useEffect(() => {
    if (checkingAuth) return;
    if (tab === "applicants") void loadApplicants();
    if (tab === "transactions") void loadTransactions();
    if (tab === "analytics") void loadAnalytics();
  }, [
    checkingAuth,
    tab,
    loadApplicants,
    loadTransactions,
    loadAnalytics,
  ]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && applications.length) {
      const found = applications.find((a) => a.id === id);
      if (found) setSelected(found);
    }
  }, [searchParams, applications]);

  const updateStatus = async (id: string, status: string) => {
    const res = await adminFetch(`/api/school-portal/${slug}/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.application) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data.application } : a)),
      );
      setSelected((prev) =>
        prev?.id === id ? { ...prev, ...data.application } : prev,
      );
      void loadDashboard();
    }
  };

  const downloadSelected = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.applicationNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: "Total Applications",
        value: metrics.totalApplications,
        icon: Users,
      },
      {
        label: "Applications Today",
        value: metrics.applicationsToday,
        icon: CalendarClock,
      },
      {
        label: "Approved",
        value: metrics.approvedApplications,
        icon: CheckCircle2,
      },
      {
        label: "Rejected",
        value: metrics.rejectedApplications,
        icon: XCircle,
      },
      {
        label: "Pending",
        value: metrics.pendingApplications,
        icon: LayoutDashboard,
      },
      {
        label: "Under Review",
        value: metrics.underReviewApplications,
        icon: Search,
      },
      {
        label: "Total Revenue (GHS)",
        value: metrics.totalRevenue.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }),
        icon: Wallet,
      },
      {
        label: "Vouchers Sold",
        value: metrics.totalVouchersSold,
        icon: Ticket,
      },
    ];
  }, [metrics]);

  const themeStyle = useMemo(
    () => brandThemeStyle({ brandColor, brandColors }),
    [brandColor, brandColors],
  );
  const deadlineExpired = isDeadlineCalendarExpired(schoolDeadline);

  const handleLogout = () => {
    window.localStorage.removeItem("tg_admin_username");
    window.localStorage.removeItem("tg_admin_role");
    window.localStorage.removeItem("tg_school_slug");
    window.localStorage.removeItem("tg_school_id");
    router.push("/admin/signin");
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "applicants", label: "Applicants", icon: Users },
    { id: "programmes", label: "Programmes", icon: BookOpen },
    { id: "blog", label: "Blog", icon: Newspaper },
    { id: "transactions", label: "Transactions", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <main
      className="min-h-screen bg-[#F3F4F6] px-4 py-4 text-[#050816] sm:px-6 sm:py-6"
      style={themeStyle}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-[var(--school-brand-border)] bg-gradient-to-r from-[var(--school-brand-soft)] via-white to-[var(--school-brand-soft)] px-4 py-4 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--school-brand-border)] bg-white shadow-sm">
                {schoolLogo ? (
                  <Image
                    src={schoolLogo}
                    alt={schoolAlias || schoolName || "School"}
                    fill
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white px-1">
                    <Image
                      src="/hero/logoTguide.png"
                      alt="TertiaryGuide"
                      width={40}
                      height={24}
                      className="h-6 w-auto"
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold sm:text-lg">
                  {(schoolAlias || schoolName || "School")} Admissions
                </p>
                <p className="text-xs text-[#6B7280]">
                  /admin/{slug}
                  {schoolAlias && schoolName && schoolAlias !== schoolName
                    ? ` · ${schoolName}`
                    : ""}
                  {actorLabel ? ` · ${actorLabel}` : ""}
                </p>
                <p
                  className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${
                    deadlineExpired ? "text-[#DC2626]" : "text-[var(--school-brand)]"
                  }`}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Deadline: {formatSchoolDeadline(schoolDeadline)}
                  {deadlineExpired ? " (Expired)" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="hidden h-8 w-8 rounded-full border border-white shadow-sm sm:inline-block"
                style={{ backgroundImage: brandGradient(brandColors) }}
                title={`Brand ${brandColors.join(" · ")}`}
              />
              {getAdminRole() !== "school_admin" && (
                <Link
                  href="/admin"
                  className="rounded-full border border-[var(--school-brand-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--school-brand)]"
                >
                  Platform admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--school-brand-border)] bg-white px-3 py-1.5 text-xs font-medium"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto border-b border-[var(--school-brand-border)] pb-px text-sm">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-2xl px-3 py-2 ${
                    active
                      ? "border-b-2 border-[var(--school-brand)] bg-white text-[var(--school-brand)]"
                      : "text-[#4B5563] hover:text-[var(--school-brand)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        {error && (
          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {tab === "dashboard" && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading && !metrics ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--school-brand)]" />
              </div>
            ) : (
              metricCards.map((m) => {
                const Icon = m.icon;
                return (
                  <article
                    key={m.label}
                    className="rounded-3xl border border-[var(--school-brand-border)] bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        {m.label}
                      </p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-[#050816]">
                      {m.value}
                    </p>
                  </article>
                );
              })
            )}
          </section>
        )}

        {tab === "applicants" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadApplicants();
                  }}
                  placeholder="Search name, email, phone…"
                className="w-full rounded-full border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--school-brand)]"
              />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {["Pending", "Under Review", "Approved", "Rejected", "Admitted"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
              <button
                type="button"
                onClick={() => void loadApplicants()}
                className="rounded-full bg-[var(--school-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--school-brand-hover)]"
              >
                Search
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Programme</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a) => (
                      <tr key={a.id} className="border-t border-[#F3F4F6]">
                        <td className="px-4 py-3 font-mono text-xs">
                          {a.applicationNumber}
                        </td>
                        <td className="px-4 py-3 font-medium">{a.fullName}</td>
                        <td className="px-4 py-3">{a.phone || "—"}</td>
                        <td className="px-4 py-3">{a.email}</td>
                        <td className="px-4 py-3">{a.programme || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--school-brand-soft)] px-2 py-0.5 text-xs text-[var(--school-brand)]">
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setSelected(a)}
                              className="rounded-full border px-2 py-0.5 text-xs"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateStatus(a.id, "Approved")}
                              className="rounded-full border border-green-200 px-2 py-0.5 text-xs text-green-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateStatus(a.id, "Rejected")}
                              className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && applications.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">
                          No applications yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "programmes" && (
          <ProgrammesSection slug={slug} onError={setError} />
        )}

        {tab === "blog" && (
          <BlogSection
            slug={slug}
            schoolId={schoolId}
            schoolName={schoolAlias || schoolName}
            onError={setError}
          />
        )}

        {tab === "transactions" && (
          <section className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-[#F3F4F6]">
                      <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                      <td className="px-4 py-3">
                        <div>{t.fullName || "—"}</div>
                        <div className="text-xs text-[#6B7280]">{t.email}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {t.programmeLevel === "postgraduate"
                          ? "Postgraduate"
                          : "Undergraduate"}
                      </td>
                      <td className="px-4 py-3">{t.product}</td>
                      <td className="px-4 py-3">GHS {t.amount}</td>
                      <td className="px-4 py-3">{t.status}</td>
                      <td className="px-4 py-3 text-xs">
                        {t.paidAt ? new Date(t.paidAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {!loading && transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "analytics" && (
          loading && !analytics ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--school-brand)]" />
            </div>
          ) : analytics ? (
            <AnalyticsSection analytics={analytics} brandColor={brandColor} />
          ) : (
            <p className="rounded-3xl border border-[#E5E7EB] bg-white px-6 py-10 text-center text-sm text-[#6B7280]">
              Could not load analytics.
            </p>
          )
        )}

        {tab === "settings" && (
          <SettingsSection
            slug={slug}
            deadline={schoolDeadline}
            brandColor={brandColor}
            brandColors={brandColors}
            voucherPrice={voucherPrice}
            undergraduateVoucherPrice={undergraduateVoucherPrice}
            postgraduateVoucherPrice={postgraduateVoucherPrice}
            description={schoolDescription}
            onError={setError}
            onSaved={(school) => {
              setSchoolDeadline(school.deadline);
              setBrandColor(school.brandColor);
              setBrandColors(school.brandColors);
              setVoucherPrice(school.voucherPrice);
              setUndergraduateVoucherPrice(school.undergraduateVoucherPrice);
              setPostgraduateVoucherPrice(school.postgraduateVoucherPrice);
              setSchoolDescription(school.description);
            }}
          />
        )}
      </div>

      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">{selected.fullName}</h2>
                <p className="text-xs text-[#6B7280]">{selected.applicationNumber}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <XCircle className="h-5 w-5 text-[#9CA3AF]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm space-y-4">
              <p>
                <strong>Status:</strong> {selected.status}
              </p>
              <p>
                <strong>Email:</strong> {selected.email}
              </p>
              <p>
                <strong>Phone:</strong> {selected.phone || "—"}
              </p>
              <p>
                <strong>Programme:</strong> {selected.programme || "—"}
              </p>
              {selected.results && selected.results.length > 0 && (
                <div>
                  <strong>Results</strong>
                  <ul className="mt-1 space-y-1">
                    {selected.results.map((r, i) => (
                      <li key={`${r.subject}-${i}`}>
                        {r.subject}: {r.grade}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => void updateStatus(selected.id, "Under Review")}
                className="rounded-full border px-3 py-1.5 text-xs"
              >
                Under Review
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(selected.id, "Approved")}
                className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(selected.id, "Rejected")}
                className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs text-white"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(selected.id, "Admitted")}
                className="rounded-full bg-[#007AFF] px-3 py-1.5 text-xs text-white"
              >
                Admit
              </button>
              <button
                type="button"
                onClick={downloadSelected}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
