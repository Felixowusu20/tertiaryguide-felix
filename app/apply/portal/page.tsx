"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  LogOut,
  Pencil,
} from "lucide-react";
import { ApplicationDocuments } from "@/app/components/ApplicationDocuments";
import { ApplicationStatusCard } from "@/app/components/ApplicationStatusCard";
import { ProgrammeChoicesList } from "@/app/components/ProgrammeChoicesList";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { brandThemeStyle } from "@/lib/brand-theme";
import { requireClientAuth } from "@/lib/client-auth";
import { partnerSchoolBuyFormsHref } from "@/lib/school-links";
import {
  listProgrammeChoices,
  type RankedProgrammeChoice,
} from "@/lib/admissions/programme-choices";
import { controlClass } from "../components/FormControls";

const SESSION_KEY = "tg_applicant_session";

type PartnerSchool = {
  id: string;
  name: string;
  alias: string | null;
  slug: string | null;
  logoSrc: string | null;
  requiresVoucher: boolean;
  brandColor?: string | null;
};

type ApplicationDetail = {
  id: string;
  applicationNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  programme: string | null;
  programmes?: RankedProgrammeChoice[];
  status: string;
  submittedAt: string;
  updatedAt: string;
  personalInfo?: Record<string, string | undefined>;
  guardianInfo?: Record<string, string | undefined> | null;
  programmeChoices?: Record<string, string | undefined> | null;
  educationalBackground?: Record<string, string | undefined>[];
  examinationInfo?: Record<string, string | undefined> | null;
  additionalExaminations?: Record<string, string | undefined>[] | null;
  examinationSittings?: Array<
    Record<string, string | undefined> & {
      results?: { subject: string; grade: string }[];
    }
  > | null;
  results?: { subject: string; grade: string }[];
  documents?: Record<string, string | undefined> | null;
  reviewNotes?: string | null;
};

type Session = {
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  brandColor?: string | null;
  voucherCode: string;
  serialNumber: string;
  application: ApplicationDetail | null;
  canEdit: boolean;
};

export default function ApplicantPortalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
        </main>
      }
    >
      <ApplicantPortalContent />
    </Suspense>
  );
}

function ApplicantPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schools, setSchools] = useState<PartnerSchool[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const email = requireClientAuth(router);
    if (!email) return;
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;

    void fetch("/api/apply/schools")
      .then((r) => r.json())
      .then((data) => {
        if (data.schools) setSchools(data.schools);
      })
      .catch(() => undefined);

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Session;
        if (saved?.voucherCode && saved?.schoolId) {
          setSession(saved);
          setSchoolId(saved.schoolId);
          setVoucherCode(saved.voucherCode);
          setSerialNumber(saved.serialNumber);
        }
      }
    } catch {
      // ignore
    }

    const code = searchParams.get("voucherCode");
    const serial = searchParams.get("serialNumber");
    const sid = searchParams.get("schoolId");
    if (code) setVoucherCode(code.toUpperCase());
    if (serial) setSerialNumber(serial.toUpperCase());
    if (sid) setSchoolId(sid);
  }, [authReady, searchParams]);

  const persistSession = (next: Session) => {
    setSession(next);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Session;
      if (!saved?.voucherCode || !saved.schoolId) return;
      void (async () => {
        const res = await fetch("/api/apply/voucher/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: saved.schoolId,
            voucherCode: saved.voucherCode,
            serialNumber: saved.serialNumber,
          }),
        });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        const next: Session = {
          schoolId: data.school.id,
          schoolName: data.school.name,
          schoolSlug: data.school.slug,
          brandColor: data.school.brandColor ?? saved.brandColor,
          voucherCode: data.voucher.voucherCode,
          serialNumber: data.voucher.serialNumber,
          application: data.application,
          canEdit: data.canEdit !== false,
        };
        persistSession(next);
      })();
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, voucherCode, serialNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const next: Session = {
        schoolId: data.school.id,
        schoolName: data.school.name,
        schoolSlug: data.school.slug,
        brandColor: data.school.brandColor ?? null,
        voucherCode: data.voucher.voucherCode,
        serialNumber: data.voucher.serialNumber,
        application: data.application,
        canEdit: data.canEdit !== false,
      };
      persistSession(next);
      if (!data.application) {
        setMessage("Voucher verified. You have not submitted an application yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMessage(null);
  };

  const activeSchool =
    schools.find((s) => s.id === (session?.schoolId || schoolId)) || null;
  const themeStyle = brandThemeStyle(
    session?.brandColor || activeSchool?.brandColor,
  );
  const chosenProgrammes = session?.application
    ? session.application.programmes?.length
      ? session.application.programmes
      : listProgrammeChoices(
          session.application.programmeChoices,
          session.application.programme,
        )
    : [];

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </main>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#0F172A]"
      style={themeStyle}
    >
      <Header />
      <main className="relative mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-6 md:pb-16 md:pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--school-brand,#007AFF)_12%,transparent),transparent_70%)]"
        />

        <header className="mb-8 flex flex-col gap-5 border-b border-[#E8EEF5] pb-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--school-brand,#007AFF)]">
              Student portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
              My application
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-[15px]">
              Check your status, review programme choices, and edit while the
              school is still reviewing.
            </p>
          </div>
          {session ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition hover:border-[#CBD5E1] hover:bg-[#F8FAFC] sm:self-auto"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          ) : null}
        </header>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {!session ? (
          <section className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-[#E8EEF5] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#EEF2F7] px-6 py-6 sm:px-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#0F172A]">
                Sign in with your voucher
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
                Enter the school, serial number, and PIN from your payment email
                or My Forms.
              </p>
            </div>
            <form
              onSubmit={handleLogin}
              className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8"
            >
              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-[#334155]">School</span>
                <select
                  required
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Select school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.alias?.trim() || s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-[#334155]">Serial number</span>
                <input
                  required
                  value={serialNumber}
                  onChange={(e) =>
                    setSerialNumber(e.target.value.toUpperCase())
                  }
                  className={`${controlClass} font-mono`}
                  placeholder="TG-2026-001234"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-[#334155]">PIN</span>
                <input
                  required
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className={`${controlClass} font-mono`}
                  placeholder="HS-8K7D-29PX"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--school-brand-hover,#0062CC)] disabled:opacity-60 sm:col-span-2"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
            <div className="border-t border-[#F1F5F9] bg-[#FCFCFD] px-6 py-4 text-center text-sm text-[#64748B] sm:px-8">
              Don’t have a form yet?{" "}
              {activeSchool ? (
                <Link
                  href={partnerSchoolBuyFormsHref(activeSchool)}
                  className="font-semibold text-[var(--school-brand,#007AFF)] underline underline-offset-2"
                >
                  Buy new forms
                </Link>
              ) : (
                <Link
                  href="/apply"
                  className="font-semibold text-[var(--school-brand,#007AFF)] underline underline-offset-2"
                >
                  Choose a school
                </Link>
              )}
            </div>
          </section>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-[#E8EEF5] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <div className="relative overflow-hidden border-b border-[#EEF2F7] px-5 py-6 sm:px-7 sm:py-7">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-[var(--school-brand-soft,#EFF6FF)] via-white to-white"
                />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                    {session.schoolName}
                  </p>
                  {session.application ? (
                    <>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A]">
                        {session.application.fullName}
                      </h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Application overview and current review status
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A]">
                        Application not submitted
                      </h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Your voucher is verified. Finish the form to send it to
                        the school.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {session.application ? (
                <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
                  <ApplicationStatusCard
                    status={session.application.status}
                    schoolName={session.schoolName}
                    reviewNotes={session.application.reviewNotes}
                  />

                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Application number
                      </dt>
                      <dd className="mt-1.5 truncate font-mono text-sm font-semibold text-[#0F172A]">
                        {session.application.applicationNumber}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Submitted
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium text-[#0F172A]">
                        {new Date(
                          session.application.submittedAt,
                        ).toLocaleString()}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Last updated
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium text-[#0F172A]">
                        {new Date(
                          session.application.updatedAt,
                        ).toLocaleString()}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-[24px] border border-[#E8EEF5] bg-[#FCFCFD] p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--school-brand-soft,#EFF6FF)] text-[var(--school-brand,#007AFF)]">
                        <GraduationCap className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold text-[#0F172A]">
                        Chosen programmes
                      </h3>
                    </div>
                    <ProgrammeChoicesList
                      programmes={chosenProgrammes}
                      columns={4}
                      emptyLabel="No programme choices on this application yet."
                    />
                  </div>

                  <ApplicationDocuments
                    documents={session.application.documents}
                    applicationNumber={session.application.applicationNumber}
                  />

                  <div className="flex flex-col gap-2 border-t border-[#F1F5F9] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                    {session.canEdit ? (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/apply?school=${session.schoolSlug || session.schoolId}&step=form&voucherCode=${encodeURIComponent(session.voucherCode)}&serialNumber=${encodeURIComponent(session.serialNumber)}`,
                          )
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--school-brand-hover,#0062CC)]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit application
                      </button>
                    ) : (
                      <p className="text-sm text-[#64748B]">
                        This application is no longer open for edits.
                      </p>
                    )}
                    <Link
                      href="/dashboard/my-forms"
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155] shadow-sm transition hover:bg-[#F8FAFC]"
                    >
                      Back to My Forms
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-7 sm:px-7">
                  <div className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-5 py-6">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-100">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-[#92400E]">
                          Ready to complete your application
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[#B45309]">
                          Your voucher is active. Fill in the application form
                          to submit it to {session.schoolName}.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/apply?school=${session.schoolSlug || session.schoolId}&step=form&voucherCode=${encodeURIComponent(session.voucherCode)}&serialNumber=${encodeURIComponent(session.serialNumber)}`,
                          )
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--school-brand-hover,#0062CC)]"
                      >
                        Complete application form
                      </button>
                      <Link
                        href="/dashboard/my-forms"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155]"
                      >
                        Back to My Forms
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
