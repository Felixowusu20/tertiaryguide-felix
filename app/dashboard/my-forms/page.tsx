"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Copy,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Loader2,
} from "lucide-react";
import { AssistanceRequestForm } from "@/app/components/AssistanceRequestForm";
import { ApplicationStatusCard } from "@/app/components/ApplicationStatusCard";
import { ProgrammeChoicesList } from "@/app/components/ProgrammeChoicesList";
import { writeApplySession } from "@/lib/admissions/applicant-session";
import {
  listProgrammeChoices,
  type RankedProgrammeChoice,
} from "@/lib/admissions/programme-choices";
import { studentStatusBadgeClass, studentStatusCopy } from "@/lib/admissions/status-messages";

interface Purchase {
  id: string;
  type: "university_form" | "partner_voucher";
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  schoolSlug?: string | null;
  name?: string;
  date: string;
  voucher?: { serial: string; pin: string } | null;
  programmeLevel?: "undergraduate" | "postgraduate";
  status: "issued" | "pending" | "used";
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    programmes?: RankedProgrammeChoice[];
    programme?: string | null;
    detail?: {
      programmeChoices?: Record<string, string | undefined> | null;
    };
  } | null;
}

const APPLICANT_SESSION_KEY = "tg_applicant_session";

function programmesFor(purchase: Purchase): RankedProgrammeChoice[] {
  if (purchase.application?.programmes?.length) {
    return purchase.application.programmes;
  }
  return listProgrammeChoices(
    purchase.application?.detail?.programmeChoices,
    purchase.application?.programme,
  );
}

function applicationStatusClass(status: string) {
  switch (status) {
    case "Approved":
    case "Admitted":
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Rejected":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";
    case "Under Review":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "Pending":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-100";
  }
}

export default function MyFormsDashboardPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openVoucherId, setOpenVoucherId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [showAssistance, setShowAssistance] = useState(false);
  const [assistanceSession, setAssistanceSession] = useState(0);

  async function fetchPurchases() {
    try {
      const email = window.localStorage.getItem("tg_user_email");
      if (!email) {
        setError("User email not found. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/user/purchases?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (res.ok) {
        const filtered = (data.purchases || []).filter(
          (p: Purchase) =>
            p.type === "university_form" || p.type === "partner_voucher",
        );
        setPurchases(filtered);
      } else {
        setError(data.error || "Failed to fetch purchases.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = window.localStorage.getItem("tg_user_email");
    if (!email) {
      router.replace(
        `/signin?redirect=${encodeURIComponent("/dashboard/my-forms")}`,
      );
      return;
    }

    void fetchPurchases();

    const handleUpdate = () => {
      void fetchPurchases();
    };

    window.addEventListener("tg-purchases-updated", handleUpdate);
    return () => window.removeEventListener("tg-purchases-updated", handleUpdate);
  }, [router]);

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const openPartnerApplication = async (purchase: Purchase) => {
    if (!purchase.schoolId || !purchase.voucher) return;

    setOpeningId(purchase.id);
    try {
      const res = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: purchase.schoolId,
          voucherCode: purchase.voucher.pin,
          serialNumber: purchase.voucher.serial,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open application");

      writeApplySession({
        schoolId: data.school.id,
        schoolSlug: data.school.slug,
        voucherCode: data.voucher.voucherCode,
        serialNumber: data.voucher.serialNumber,
        email: window.localStorage.getItem("tg_user_email") || undefined,
      });

      window.localStorage.setItem(
        APPLICANT_SESSION_KEY,
        JSON.stringify({
          schoolId: data.school.id,
          schoolName: data.school.name,
          schoolSlug: data.school.slug,
          brandColor: data.school.brandColor ?? null,
          voucherCode: data.voucher.voucherCode,
          serialNumber: data.voucher.serialNumber,
          application: data.application,
          canEdit: data.canEdit !== false,
        }),
      );

      router.push("/apply/portal");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open your application. Please try again.",
      );
    } finally {
      setOpeningId(null);
    }
  };

  function statusLabel(purchase: Purchase) {
    if (purchase.application?.status) {
      return studentStatusCopy(purchase.application.status).badge;
    }
    if (purchase.status === "pending") return "Pending voucher";
    if (purchase.status === "used") return "Submitted";
    if (purchase.type === "partner_voucher") return "Ready to apply";
    return "Active";
  }

  const chosenProgrammes = useMemo(() => {
    return purchases.flatMap((purchase) =>
      programmesFor(purchase).map((programme) => ({
        ...programme,
        schoolName: purchase.schoolName || "School",
        schoolLogo: purchase.schoolLogo,
        applicationStatus: purchase.application?.status || statusLabel(purchase),
        purchaseId: purchase.id,
      })),
    );
  }, [purchases]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-sm font-medium text-[#555555]">Loading your forms...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold leading-tight text-[#1E1E1E] sm:text-3xl">
            My Forms
          </h1>
          <p className="text-sm text-[#555555]">
            Your applications, chosen programmes, and vouchers in one place
          </p>
        </div>

        <div className="relative shrink-0">
          {!showAssistance ? (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#007AFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#007AFF]/10 transition-all hover:bg-[#0062CC] hover:shadow-xl active:scale-95"
              onClick={() => {
                setAssistanceSession((s) => s + 1);
                setShowAssistance(true);
              }}
            >
              Get assistance
            </button>
          ) : (
            <AssistanceRequestForm
              key={assistanceSession}
              variant="drawer"
              onClose={() => setShowAssistance(false)}
            />
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-3xl bg-[#FEF2F2] p-8 text-center">
          <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-[32px] border border-[#E8EEF5] bg-white py-20 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF6FF]">
            <GraduationCap className="h-7 w-7 text-[#007AFF]" />
          </span>
          <h2 className="mb-2 text-xl font-bold text-[#1E1E1E]">No applications yet</h2>
          <p className="mb-8 max-w-sm text-sm text-[#555555]">
            Buy a university form or a direct-application voucher, then your chosen
            programmes will appear here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/university-forms"
              className="rounded-full bg-[#007AFF] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#0062CC]"
            >
              Browse Forms
            </Link>
            <Link
              href="/apply"
              className="rounded-full border border-[#007AFF] px-8 py-3 text-sm font-medium text-[#007AFF] transition hover:bg-[#EFF6FF]"
            >
              Direct Applications
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <section className="rounded-[28px] border border-[#E8EEF5] bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#007AFF] text-white">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Applied & chosen programmes
                </h2>
                <p className="text-sm text-[#64748B]">
                  {chosenProgrammes.length > 0
                    ? `${chosenProgrammes.length} programme${chosenProgrammes.length === 1 ? "" : "s"} across your applications`
                    : "Programme choices will show here after you submit an application"}
                </p>
              </div>
            </div>
            {chosenProgrammes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#D7E3F4] bg-[#F8FAFC] px-4 py-4 text-sm text-[#64748B]">
                You have forms linked to your account, but no programme choices yet.
                Open an application to select your 1st–4th choices.
              </p>
            ) : (
              <ul className="grid auto-rows-fr grid-cols-1 gap-3 min-[640px]:grid-cols-2 xl:grid-cols-4">
                {chosenProgrammes.map((item) => (
                  <li
                    key={`${item.purchaseId}-${item.rank}-${item.display}`}
                    className="flex h-full items-start gap-3 rounded-2xl border border-[#EEF2F7] bg-[#F8FBFF] px-4 py-3.5"
                  >
                    {item.schoolLogo ? (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#EEF2F7]">
                        <Image
                          src={item.schoolLogo}
                          alt=""
                          fill
                          className="object-contain p-1"
                        />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#007AFF] ring-1 ring-[#EEF2F7]">
                        {item.rank}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#007AFF]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">
                          {item.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${studentStatusBadgeClass(item.applicationStatus)}`}
                        >
                          {studentStatusCopy(item.applicationStatus).badge}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-[#0F172A]">
                        {item.programme}
                      </p>
                      {item.stream ? (
                        <p className="mt-0.5 truncate text-xs text-[#64748B]">
                          {item.stream}
                        </p>
                      ) : null}
                      <p className="mt-1 truncate text-xs font-medium text-[#94A3B8]">
                        {item.schoolName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-base font-semibold text-[#0F172A]">
              Applications & vouchers
            </h2>
            <div className="grid auto-rows-fr grid-cols-1 gap-5 xl:grid-cols-2">
              {purchases.map((purchase) => {
                const programmes = programmesFor(purchase);
                const voucherOpen = openVoucherId === purchase.id;
                return (
                  <article
                    key={purchase.id}
                    className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E8EEF5] bg-white"
                  >
                    <div
                      className={`px-5 py-5 sm:px-6 ${
                        purchase.type === "partner_voucher"
                          ? "bg-[#ECFDF5]"
                          : "bg-[#EFF6FF]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {purchase.schoolLogo ? (
                            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                              <Image
                                src={purchase.schoolLogo}
                                alt=""
                                fill
                                className="object-contain p-1"
                              />
                            </span>
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#007AFF] ring-1 ring-black/5">
                              <GraduationCap className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[#0F172A]">
                              {purchase.schoolName}
                            </h3>
                            <p className="truncate text-xs text-[#64748B]">
                              {purchase.programmeLevel === "postgraduate"
                                ? "Postgraduate"
                                : "Undergraduate"}{" "}
                              ·{" "}
                              {new Date(purchase.date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              {purchase.application?.applicationNumber
                                ? ` · ${purchase.application.applicationNumber}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              purchase.type === "partner_voucher"
                                ? "text-[#0F766E]"
                                : "text-[#007AFF]"
                            }`}
                          >
                            {purchase.type === "partner_voucher"
                              ? "Direct apply"
                              : "University form"}
                          </span>
                          <span
                            className={`rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold ${
                              purchase.application?.status
                                ? studentStatusBadgeClass(purchase.application.status)
                                : applicationStatusClass(statusLabel(purchase))
                            }`}
                          >
                            {statusLabel(purchase)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-6">
                      {purchase.type === "partner_voucher" ? (
                        <>
                          {purchase.application?.status ? (
                            <ApplicationStatusCard
                              status={purchase.application.status}
                              schoolName={purchase.schoolName}
                              compact
                            />
                          ) : null}
                          <ProgrammeChoicesList
                            title="Chosen programmes"
                            programmes={programmes}
                            columns={2}
                            emptyLabel="No programmes chosen on this application yet."
                          />
                        </>
                      ) : (
                        <p className="text-sm text-[#64748B]">
                          University form voucher. Use the serial and PIN on the
                          school’s own portal.
                        </p>
                      )}

                      {voucherOpen && purchase.voucher ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {(
                            [
                              ["Serial", purchase.voucher.serial, "serial"],
                              ["PIN", purchase.voucher.pin, "pin"],
                            ] as const
                          ).map(([label, value, key]) => (
                            <div
                              key={key}
                              className="rounded-2xl bg-[#0B1220] px-4 py-3 text-white"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                  {label}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(value, `${purchase.id}-${key}`)
                                  }
                                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/15"
                                >
                                  <Copy
                                    className={`h-3 w-3 ${
                                      copyingId === `${purchase.id}-${key}`
                                        ? "text-[#4ADE80]"
                                        : ""
                                    }`}
                                  />
                                  Copy
                                </button>
                              </div>
                              <p className="mt-1 truncate font-mono text-base font-bold tracking-tight">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {!purchase.voucher && purchase.status === "pending" ? (
                        <p className="rounded-2xl bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                          Your voucher is being prepared. Use Get assistance if you
                          need help.
                        </p>
                      ) : null}

                      <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {purchase.voucher ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenVoucherId((id) =>
                                id === purchase.id ? null : purchase.id,
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            {voucherOpen ? "Hide serial & PIN" : "Serial & PIN"}
                          </button>
                        ) : (
                          <span className="hidden sm:block" />
                        )}
                        {purchase.type === "partner_voucher" && purchase.voucher ? (
                          <button
                            type="button"
                            onClick={() => void openPartnerApplication(purchase)}
                            disabled={openingId === purchase.id}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0062CC] disabled:opacity-60"
                          >
                            {openingId === purchase.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                            Open application
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
