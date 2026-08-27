"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Megaphone,
  Newspaper,
  Package,
  Compass,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import AdminFormsSection from "./AdminFormsSection";
import { AdminAnalyticsSection } from "./AdminAnalyticsSection";
import { AdminBlogSection } from "./AdminBlogSection";
import { AdminUsersSection } from "./AdminUsersSection";
import { AdminCheckersSection } from "./AdminCheckersSection";
import { AdminAssistanceSection } from "./AdminAssistanceSection";
import { AdminAdsSection } from "./AdminAdsSection";
import { AdminAdReportsSection } from "./AdminAdReportsSection";
import { AdminFormRequestsSection } from "./AdminFormRequestsSection";
import { AdminSettingsSection } from "./AdminSettingsSection";
import { AdminStaffSection } from "./AdminStaffSection";
import { AdminPartnerSchoolsSection } from "./AdminPartnerSchoolsSection";
import { AdminExploreSection } from "./AdminExploreSection";
import { AdminEmailCampaignsSection } from "./AdminEmailCampaignsSection";
import { AdminApplicationsSection } from "./AdminApplicationsSection";
import { NotificationInbox } from "@/app/components/NotificationInbox";
import {
  ADMIN_NOTIFICATIONS_KEY,
  resolveAdminNotificationSection,
  type AdminNotification,
} from "@/lib/notifications";

type AdminSection =
  | "dashboard"
  | "forms"
  | "partnerSchools"
  | "applications"
  | "analytics"
  | "users"
  | "checkers"
  | "assistance"
  | "formRequests"
  | "blog"
  | "explore"
  | "ads"
  | "adReports"
  | "emailCampaigns"
  | "settings"
  | "staff";

const baseMetrics = [
  {
    id: 1,
    label: "Total Voucher Orders",
    period: "All time",
    description: "All paid university voucher orders",
    tone: "blue" as const,
    value: "—",
  },
  {
    id: 2,
    label: "Unissued Vouchers",
    period: "Current",
    description: "Paid voucher orders still awaiting codes",
    tone: "red" as const,
    value: "—",
  },
  {
    id: 3,
    label: "Issued Vouchers",
    period: "All time",
    description: "Voucher orders already fulfilled",
    tone: "green" as const,
    value: "—",
  },
];

const initialUnservedForms: {
  id: string;
  school: string;
  name: string;
  date: string;
}[] = [];

function periodBadge(period: string) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#2563EB]">
      {period}
      <span className="ml-1 text-[10px] text-[#60A5FA]">⇅</span>
    </span>
  );
}

function toneDot(tone: "blue" | "red" | "green") {
  const config: Record<
    "blue" | "red" | "green",
    { bg: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }
  > = {
    blue: { bg: "bg-[#DBEAFE]", icon: Package, iconColor: "text-[#2563EB]" },
    red: { bg: "bg-[#FEE2E2]", icon: AlertTriangle, iconColor: "text-[#DC2626]" },
    green: { bg: "bg-[#DCFCE7]", icon: Users, iconColor: "text-[#16A34A]" },
  };

  const { bg, icon: Icon, iconColor } = config[tone];

  return (
    <span
      className={`mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${bg}`}
    >
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<"admin" | "superadmin" | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<
    AdminNotification[]
  >([]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("tg_admin_username")
            : null;
        const storedRole =
          typeof window !== "undefined"
            ? window.localStorage.getItem("tg_admin_role")
            : null;

        if (!stored) {
          const res = await fetch("/api/admin/setup/status");
          const data = await res.json();
          if (res.ok && data.needsSetup) {
            router.replace("/admin/setup");
            return;
          }
          router.replace("/admin/signin");
          return;
        }

        if (storedRole === "school_admin") {
          const schoolSlug =
            typeof window !== "undefined"
              ? window.localStorage.getItem("tg_school_slug")
              : null;
          router.replace(schoolSlug ? `/admin/${schoolSlug}` : "/admin/signin");
          return;
        }

        setAdminName(stored);
        setAdminRole(storedRole === "superadmin" ? "superadmin" : "admin");
      } finally {
        setCheckingAuth(false);
      }
    }

    void checkAuth();
  }, [router]);

  useEffect(() => {
    if (adminRole !== "superadmin" && activeSection === "staff") {
      setActiveSection("dashboard");
    }
  }, [adminRole, activeSection]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(initial: boolean) {
      if (initial) {
        setFormsLoading(true);
        setFormsError(null);
      }

      try {
        const [res, metricsRes] = await Promise.all([
          fetch("/api/admin/forms"),
          fetch("/api/admin/analytics/forms"),
        ]);
        const [data, metricsData] = await Promise.all([res.json(), metricsRes.json()]);

        if (!res.ok || !metricsRes.ok) {
          if (initial) {
            setFormsError(
              data?.error ||
                metricsData?.error ||
                "Could not load voucher overview. Please try again.",
            );
          }
          return;
        }

        if (cancelled) return;

        const forms: {
          id?: string;
          status?: string;
          name?: string;
          school?: string;
          date?: string;
        }[] = Array.isArray(data.forms) ? data.forms : [];

        setFormsTotal(
          typeof metricsData.voucherTotal === "number" ? metricsData.voucherTotal : null,
        );
        setFormsIssued(
          typeof metricsData.voucherIssued === "number" ? metricsData.voucherIssued : null,
        );
        setFormsUnissued(
          typeof metricsData.voucherUnissued === "number"
            ? metricsData.voucherUnissued
            : null,
        );
        setCheckerTotal(
          typeof metricsData.checkerTotal === "number" ? metricsData.checkerTotal : null,
        );

        const unissuedRows = forms
          .filter((f) => f.status === "Unissued")
          .slice(0, 6)
          .map((f) => {
            const rawDate = f.date;
            let formattedDate = "—";
            if (typeof rawDate === "string") {
              const d = new Date(rawDate);
              formattedDate = Number.isNaN(d.getTime())
                ? rawDate
                : d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  });
            }

            return {
              id: typeof f.id === "string" ? f.id : `${f.name}-${formattedDate}`,
              school: (f.school ?? "—").trim() || "—",
              name: f.name || "Unknown buyer",
              date: formattedDate,
            };
          });

        setUnservedForms(unissuedRows);
      } catch {
        if (!cancelled && initial) {
          setFormsError("Could not load voucher overview. Please try again.");
        }
      } finally {
        if (!cancelled && initial) {
          setFormsLoading(false);
        }
      }
    }

    void load(true);

    const id = window.setInterval(() => {
      void load(false);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const loadAdminNotifications = () => {
      try {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(ADMIN_NOTIFICATIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setAdminNotifications(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAdminNotifications([]);
      }
    };

    loadAdminNotifications();

    const handleUpdated = () => {
      loadAdminNotifications();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_NOTIFICATIONS_KEY) {
        loadAdminNotifications();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "tg-admin-notifications-updated",
        handleUpdated as EventListener,
      );
      window.addEventListener("storage", handleStorage as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "tg-admin-notifications-updated",
          handleUpdated as EventListener,
        );
        window.removeEventListener(
          "storage",
          handleStorage as EventListener,
        );
      }
    };
  }, []);

  const VOUCHER_NOTIF_CURSOR_KEY = "tg_admin_voucher_notif_paidat_cursor";

  // Poll form voucher purchases (MongoDB) so the admin panel updates without relying on the buyer’s browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkingAuth) return;
    if (!adminName) return;

    let cancelled = false;

    const syncVoucherPurchaseNotifications = async () => {
      try {
        const res = await fetch("/api/admin/forms/payments");
        const data = (await res.json()) as {
          ok?: boolean;
          payments?: {
            id: string;
            reference: string;
            email: string;
            fullName: string | null;
            school: string;
            paidAt: string;
            voucherPending?: boolean;
            amount: number;
          }[];
        };

        if (cancelled || !data?.ok || !Array.isArray(data.payments)) return;

        const payments = data.payments;
        if (payments.length === 0) return;

        const cursor = localStorage.getItem(VOUCHER_NOTIF_CURSOR_KEY);
        if (cursor === null) {
          localStorage.setItem(VOUCHER_NOTIF_CURSOR_KEY, payments[0].paidAt);
          return;
        }

        const newOnes = payments.filter((p) => p.paidAt > cursor!);
        if (newOnes.length === 0) return;

        const items: AdminNotification[] = newOnes.map((p) => {
          const amountGhs = (p.amount / 100).toFixed(2);
          const notifId = `voucher-form-${p.reference}`;
          const who = p.fullName ? `${p.fullName} <${p.email}>` : p.email;
          if (p.voucherPending) {
            return {
              id: notifId,
              title: "New form voucher order (queued)",
              body: `${who} — ${p.school} · GHS ${amountGhs} (ref: ${p.reference}). Awaiting stock; fulfill when a voucher is available.`,
              read: false,
              createdAt: p.paidAt,
              section: "forms",
            };
          }
          return {
            id: notifId,
            title: "New form voucher purchase",
            body: `${who} — ${p.school} · GHS ${amountGhs} (ref: ${p.reference}). Voucher has been sent by email.`,
            read: false,
            createdAt: p.paidAt,
            section: "forms",
          };
        });

        const newestPaidAt = payments[0].paidAt;
        localStorage.setItem(VOUCHER_NOTIF_CURSOR_KEY, newestPaidAt);

        setAdminNotifications((current) => {
          const existingIds = new Set(current.map((n) => n.id));
          const toPrepend = items.filter((n) => !existingIds.has(n.id));
          if (toPrepend.length === 0) return current;
          const next = [...toPrepend, ...current];
          try {
            window.localStorage.setItem(
              ADMIN_NOTIFICATIONS_KEY,
              JSON.stringify(next),
            );
          } catch {
            // ignore
          }
          return next;
        });
        window.dispatchEvent(new CustomEvent("tg-admin-notifications-updated"));
      } catch {
        // ignore
      }
    };

    void syncVoucherPurchaseNotifications();
    const interval = window.setInterval(syncVoucherPurchaseNotifications, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [checkingAuth, adminName]);

  const updateAdminNotifications = (
    updater: (
      current: typeof adminNotifications,
    ) => typeof adminNotifications,
  ) => {
    if (typeof window === "undefined") return;

    setAdminNotifications((current) => {
      const next = updater(current);
      window.localStorage.setItem(
        ADMIN_NOTIFICATIONS_KEY,
        JSON.stringify(next),
      );
      return next;
    });

    window.dispatchEvent(new CustomEvent("tg-admin-notifications-updated"));
  };

  const unreadAdminCount = adminNotifications.filter((n) => !n.read).length;

  const openAdminNotification = (item: { id: string }) => {
    const match = adminNotifications.find((n) => n.id === item.id);
    if (!match) return;
    updateAdminNotifications((current) =>
      current.map((n) => (n.id === match.id ? { ...n, read: true } : n)),
    );
    setNotificationsOpen(false);
    const section = resolveAdminNotificationSection(match);
    setActiveSection(section as AdminSection);
  };

  const [visitorsLoading, setVisitorsLoading] = useState(true);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);
  const [totalVisits7d, setTotalVisits7d] = useState<number | null>(null);
  const [uniqueVisitors7d, setUniqueVisitors7d] = useState<number | null>(null);

  const [formsTotal, setFormsTotal] = useState<number | null>(null);
  const [formsIssued, setFormsIssued] = useState<number | null>(null);
  const [formsUnissued, setFormsUnissued] = useState<number | null>(null);
  const [checkerTotal, setCheckerTotal] = useState<number | null>(null);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [unservedForms, setUnservedForms] = useState<typeof initialUnservedForms>(
    initialUnservedForms,
  );

  useEffect(() => {
    let cancelled = false;

    async function load(initial: boolean) {
      if (initial) {
        setVisitorsLoading(true);
        setVisitorsError(null);
      }

      try {
        const res = await fetch("/api/admin/analytics/visits");
        const data = await res.json();

        if (!res.ok) {
          if (initial) {
            setVisitorsError(
              data?.error || "Could not load visitors. Please try again.",
            );
          }
          return;
        }

        if (!cancelled) {
          setTotalVisits7d(
            typeof data.totalVisits7d === "number" ? data.totalVisits7d : null,
          );
          setUniqueVisitors7d(
            typeof data.uniqueVisitors7d === "number"
              ? data.uniqueVisitors7d
              : null,
          );
        }
      } catch {
        if (!cancelled && initial) {
          setVisitorsError("Could not load visitors. Please try again.");
        }
      } finally {
        if (!cancelled && initial) {
          setVisitorsLoading(false);
        }
      }
    }

    load(true);

    const id = window.setInterval(() => {
      load(false);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("tg_admin_username");
        window.localStorage.removeItem("tg_admin_role");
      }
    } catch {
      // ignore storage errors
    }

    router.replace("/admin/signin");
  };

  const formattedDate = now.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    weekday: "short",
  });

  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit", // includes seconds
    hour12: false,
  });

  if (checkingAuth) {
    return null;
  }

  const metrics = baseMetrics.map((metric) => {
    if (metric.label === "Total Voucher Orders") {
      return {
        ...metric,
        value: formsTotal !== null ? formsTotal.toString() : "—",
      };
    }

    if (metric.label === "Unissued Vouchers") {
      return {
        ...metric,
        value: formsUnissued !== null ? formsUnissued.toString() : "—",
      };
    }

    if (metric.label === "Issued Vouchers") {
      return {
        ...metric,
        value: formsIssued !== null ? formsIssued.toString() : "—",
      };
    }

    return metric;
  });

  const adminNavScroll =
    "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const adminNavItems: {
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    superadminOnly?: boolean;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "forms", label: "Forms", icon: FileText },
    { id: "partnerSchools", label: "Partner schools", icon: Building2 },
    { id: "applications", label: "Applications", icon: GraduationCap },
    { id: "formRequests", label: "Form requests", icon: ClipboardList },
    { id: "users", label: "Users", icon: Users },
    { id: "checkers", label: "Checkers", icon: ShieldCheck },
    { id: "assistance", label: "Assistance", icon: HelpCircle },
    { id: "blog", label: "Blog", icon: Newspaper },
    { id: "explore", label: "Explore", icon: Compass },
    { id: "ads", label: "Ads", icon: Megaphone },
    { id: "adReports", label: "Ad reports", icon: LineChart },
    { id: "emailCampaigns", label: "Email campaigns", icon: Mail },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "staff", label: "Admin team", icon: UserCog, superadminOnly: true },
  ];

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-4 text-[#050816] sm:px-6 md:px-10">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-6 sm:gap-8">
        <header className="overflow-hidden rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-4 py-4 shadow-sm sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 items-center rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#DBEAFE]">
                <Image
                  src="/hero/logoTguide.png"
                  alt="TertiaryGuide"
                  width={150}
                  height={34}
                  className="h-8 w-auto"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight text-[#050816] sm:text-lg">
                  TertiaryGuide Admin
                </p>
                <p className="hidden text-xs text-[#4B5563] sm:block">
                  Manage forms, staff, analytics, and support activity
                </p>
              </div>
              {adminRole === "superadmin" && (
                <span className="hidden rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#92400E] sm:inline">
                  Superadmin
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#BFDBFE] bg-white text-[#0F172A] hover:bg-[#EFF6FF] sm:h-10 sm:w-10"
                  aria-label="Admin notifications"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                {unreadAdminCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-[#EF4444] px-0.5 text-[9px] font-semibold text-white shadow-sm sm:-right-1 sm:-top-1 sm:h-4 sm:min-w-[1rem] sm:px-1 sm:text-[10px]">
                    {unreadAdminCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-[#EFF6FF] sm:px-4 sm:py-2 sm:text-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>

          <nav
            className={`${adminNavScroll} mt-5 flex gap-2 border-b border-[#DBEAFE] px-1 pb-px text-xs font-medium text-[#4B5563] sm:px-0 sm:text-sm`}
            aria-label="Admin sections"
          >
            {adminNavItems
              .filter((item) => !item.superadminOnly || adminRole === "superadmin")
              .map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-2xl px-3 py-2 transition ${
                      active
                        ? "border-b-2 border-[#007AFF] bg-white text-[#007AFF] shadow-sm"
                        : "text-[#4B5563] hover:bg-white/70 hover:text-[#007AFF]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
          </nav>
        </header>

        {activeSection === "dashboard" ? (
          <>
            <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#007AFF] to-[#2B8FFF] px-5 py-6 text-white shadow-sm sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
                  <LayoutDashboard className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                    Admin overview
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                    {`Welcome back, ${adminName || "Admin"}`}
                  </h1>
                </div>
              </div>
              <p className="text-sm text-white/85">
                {formattedDate}, {formattedTime}
              </p>
              <p className="text-xs text-white/75">
                Voucher cards are synced to live totals. WASSCE checker purchases:
                {" "}
                <span className="font-semibold text-white">
                  {checkerTotal ?? "—"}
                </span>
              </p>
            </section>

            <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
              <div className="grid min-w-0 gap-5 md:grid-cols-2">
                {metrics.map((metric) => (
                  <article
                    key={metric.id}
                    className="flex flex-col justify-between rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-6 py-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        {periodBadge(metric.period)}
                      </div>
                      <div className="h-px w-full bg-[#DBEAFE]" />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center text-sm font-medium text-[#4B5563]">
                        {toneDot(metric.tone)}
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {metric.label}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{metric.description}</p>
                        </div>
                      </div>

                      <p className="mt-4 text-3xl font-semibold tracking-tight text-[#050816]">
                        {metric.value}
                      </p>

                      <p className="mt-2 text-xs text-[#6B7280]">
                        Synced from live voucher totals
                      </p>
                    </div>
                  </article>
                ))}

                <article className="flex flex-col justify-between rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-6 py-5 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      {periodBadge("Daily")}
                    </div>
                    <div className="h-px w-full bg-[#DBEAFE]" />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center text-sm font-medium text-[#4B5563]">
                      {toneDot("blue")}
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">Visitors</p>
                        <p className="text-xs text-[#9CA3AF]">
                          Unique visitors in the last 7 days
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-3xl font-semibold tracking-tight text-[#050816]">
                      {visitorsLoading
                        ? "..."
                        : uniqueVisitors7d !== null
                          ? uniqueVisitors7d
                          : totalVisits7d !== null
                            ? totalVisits7d
                            : "—"}
                    </p>

                    {visitorsError ? (
                      <p className="mt-1 text-xs text-[#DC2626]">
                        {visitorsError}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[#6B7280]">
                        {totalVisits7d !== null
                          ? `${totalVisits7d} page views tracked`
                          : "Updates every minute"}
                      </p>
                    )}
                  </div>
                </article>
              </div>

              <aside className="flex min-w-0 flex-col rounded-3xl border border-[#DBEAFE] bg-white shadow-sm">
                {/* Card header */}
                <div className="flex flex-col gap-1 rounded-t-3xl bg-gradient-to-r from-[#F8FBFF] to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827]">
                      <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                      Unissued Vouchers
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[#6B7280]">
                      Latest paid voucher orders waiting for codes
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#EFF6FF]"
                    aria-label="More options"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-current" />
                    <span className="mx-[3px] inline-block h-1 w-1 rounded-full bg-current" />
                    <span className="inline-block h-1 w-1 rounded-full bg-current" />
                  </button>
                </div>
                <div className="overflow-x-auto rounded-b-3xl">
                  {/* Inset header bar, not touching card edges */}
                  <div className="min-w-[300px]">
                    <div className="mx-4 grid min-w-0 grid-cols-[1.2fr_1fr_0.85fr] gap-1 rounded-t-2xl bg-[#EFF6FF] px-3 py-2 text-xs font-medium text-[#31557D] sm:mx-6 sm:grid-cols-[1.4fr_1.1fr_0.9fr] sm:px-4">
                      <span className="min-w-0 truncate">School</span>
                      <span className="min-w-0 truncate">Buyer</span>
                      <span className="text-right">Date</span>
                    </div>

                    <div className="mx-4 divide-y divide-[#E5E7EB] rounded-b-2xl bg-[#FCFEFF] sm:mx-6">
                      {formsLoading ? (
                        <div className="px-3 py-3 text-xs text-[#6B7280] sm:px-4">
                          Loading voucher orders...
                        </div>
                      ) : formsError ? (
                        <div className="px-3 py-3 text-xs text-[#DC2626] sm:px-4">
                          {formsError}
                        </div>
                      ) : unservedForms.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-[#6B7280] sm:px-4">
                          No unissued vouchers at the moment.
                        </div>
                      ) : (
                        unservedForms.map((row) => (
                          <div
                            key={row.id}
                            className="grid min-w-0 grid-cols-[1.2fr_1fr_0.85fr] gap-1 px-3 py-2.5 text-xs text-[#111827] sm:grid-cols-[1.4fr_1.1fr_0.9fr] sm:px-4 sm:py-3 sm:text-sm"
                          >
                            <span
                              className="min-w-0 break-words font-medium"
                              title={row.school}
                            >
                              {row.school}
                            </span>
                            <span
                              className="min-w-0 break-words text-[#4B5563]"
                              title={row.name}
                            >
                              {row.name}
                            </span>
                            <span className="text-right text-[#6B7280]">
                              {row.date}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-[#F8FBFF] to-white px-5 py-5 shadow-sm">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#7C93B0]">
                  <Package className="h-4 w-4 text-[#007AFF]" />
                  Voucher fulfilment
                </p>
                <p className="mt-2 text-lg font-semibold text-[#111827]">
                  Keep voucher orders and delivery records aligned
                </p>
                <p className="mt-2 text-sm text-[#5B6B7F]">
                  These overview cards now use the same live totals shown in analytics.
                </p>
              </article>
              <article className="rounded-3xl border border-[#DCFCE7] bg-gradient-to-br from-white to-[#F0FDF4] px-5 py-5 shadow-sm">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#4D7C0F]">
                  <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                  Issued snapshot
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#166534]">
                  {formsIssued ?? "—"}
                </p>
                <p className="mt-2 text-sm text-[#4B5563]">
                  Voucher orders already fulfilled and sent to buyers.
                </p>
              </article>
              <article className="rounded-3xl border border-[#FECACA] bg-gradient-to-br from-white to-[#FEF2F2] px-5 py-5 shadow-sm">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#B91C1C]">
                  <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                  Needs action
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#B91C1C]">
                  {formsUnissued ?? "—"}
                </p>
                <p className="mt-2 text-sm text-[#4B5563]">
                  Paid voucher orders still waiting for code assignment.
                </p>
              </article>
            </section>
          </>
        ) : activeSection === "forms" ? (
          <AdminFormsSection />
        ) : activeSection === "partnerSchools" ? (
          <AdminPartnerSchoolsSection />
        ) : activeSection === "applications" ? (
          <AdminApplicationsSection />
        ) : activeSection === "formRequests" ? (
          <AdminFormRequestsSection />
        ) : activeSection === "users" ? (
          <AdminUsersSection />
        ) : activeSection === "checkers" ? (
          <AdminCheckersSection />
        ) : activeSection === "assistance" ? (
          <AdminAssistanceSection />
        ) : activeSection === "blog" ? (
          <AdminBlogSection />
        ) : activeSection === "explore" ? (
          <AdminExploreSection />
        ) : activeSection === "ads" ? (
          <AdminAdsSection />
        ) : activeSection === "adReports" ? (
          <AdminAdReportsSection />
        ) : activeSection === "emailCampaigns" ? (
          <AdminEmailCampaignsSection />
        ) : activeSection === "settings" ? (
          <AdminSettingsSection adminName={adminName || "Admin"} adminRole={adminRole} />
        ) : activeSection === "staff" ? (
          <AdminStaffSection />
        ) : (
          <AdminAnalyticsSection />
        )}

        {notificationsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
              onClick={() => setNotificationsOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl [padding-bottom:env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4">
                <div>
                  <h2 className="text-base font-semibold text-[#1E1E1E]">
                    Admin notifications
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">
                    Tap an item to open the related admin section.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E0E0E0] text-[#1E1E1E] hover:bg-[#F5F5F5]"
                  aria-label="Close notifications"
                >
                  ×
                </button>
              </div>

              <NotificationInbox
                items={adminNotifications}
                emptyTitle="No admin notifications yet"
                emptyBody="New form voucher and WASSCE checker activity will appear here."
                onOpen={openAdminNotification}
                onToggleRead={(id) =>
                  updateAdminNotifications((current) =>
                    current.map((n) =>
                      n.id === id ? { ...n, read: !n.read } : n,
                    ),
                  )
                }
                onDelete={(id) =>
                  updateAdminNotifications((current) =>
                    current.filter((n) => n.id !== id),
                  )
                }
                onMarkAllRead={() =>
                  updateAdminNotifications((current) =>
                    current.map((n) => ({ ...n, read: true })),
                  )
                }
                onMarkAllUnread={() =>
                  updateAdminNotifications((current) =>
                    current.map((n) => ({ ...n, read: false })),
                  )
                }
                onClearAll={() => {
                  if (adminNotifications.length === 0) return;
                  if (!window.confirm("Clear all admin notifications?")) return;
                  updateAdminNotifications(() => []);
                }}
              />

              <div className="border-t border-[#E5E5E5] px-4 py-2.5 text-xs text-[#9E9E9E] sm:px-5 sm:py-3">
                Manage what you receive from
                <span className="font-medium text-[#1E1E1E]"> Admin notifications</span>
                <span> • TertiaryGuide</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
