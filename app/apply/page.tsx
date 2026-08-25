"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { SchoolListLabel } from "@/app/components/SchoolListLabel";
import { isDeadlineCalendarExpired } from "@/lib/deadlines";
import { brandThemeStyle } from "@/lib/brand-theme";
import {
  getStoredUserEmail,
  getStoredUserName,
  requireClientAuth,
} from "@/lib/client-auth";
import {
  readApplySession,
  writeApplySession,
} from "@/lib/admissions/applicant-session";
import { MultiStepApplicationForm } from "./components/MultiStepApplicationForm";
import {
  PROGRAMME_LEVEL_LABELS,
  type ProgrammeLevel,
} from "@/lib/admissions/programme-level";

type PartnerSchool = {
  id: string;
  name: string;
  alias: string | null;
  slug: string | null;
  description: string | null;
  logoSrc: string | null;
  logoAlt?: string | null;
  voucherPrice: number | null;
  undergraduateVoucherPrice?: number | null;
  postgraduateVoucherPrice?: number | null;
  requiresVoucher: boolean;
  deadline?: string | null;
  brandColor?: string | null;
};

function schoolLabel(school: Pick<PartnerSchool, "name" | "alias">) {
  return school.alias?.trim() || school.name;
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return "—";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Step =
  | "select"
  | "voucher"
  | "voucher-success"
  | "login"
  | "form"
  | "done";

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--school-brand,#007AFF)]" />
        </main>
      }
    >
      <ApplyContent />
    </Suspense>
  );
}

function ApplyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [schools, setSchools] = useState<PartnerSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [school, setSchool] = useState<PartnerSchool | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Purchase
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [programmeLevel, setProgrammeLevel] = useState<ProgrammeLevel | "">("");

  // Issued voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [submitted, setSubmitted] = useState<{
    applicationNumber: string;
    schoolName: string;
  } | null>(null);

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const email = requireClientAuth(router);
    if (!email) return;
    setAuthReady(true);
    setBuyerEmail(email);
    setLoginEmail(email);
    const name = getStoredUserName();
    if (name) setBuyerName(name);
    void fetch(`/api/user/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.username) setBuyerName(data.user.username);
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/apply/schools");
        const data = await res.json();
        if (!cancelled && res.ok) setSchools(data.schools || []);
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  // Deep-link: ?school=slug&step=...
  useEffect(() => {
    if (loadingSchools || schools.length === 0) return;
    const schoolParam = searchParams.get("school");
    const stepParam = searchParams.get("step") as Step | null;
    const reference = searchParams.get("reference");

    if (schoolParam) {
      const found = schools.find(
        (s) => s.slug === schoolParam || s.id === schoolParam,
      );
      if (found) setSchool(found);
    }

    const codeParam = searchParams.get("voucherCode");
    const serialParam = searchParams.get("serialNumber");
    if (codeParam) setVoucherCode(codeParam.toUpperCase());
    if (serialParam) setSerialNumber(serialParam.toUpperCase());

    // Restore voucher session if URL lost credentials (e.g. refresh on form step)
    if ((!codeParam || !serialParam) && schoolParam) {
      const found = schools.find(
        (s) => s.slug === schoolParam || s.id === schoolParam,
      );
      const saved = readApplySession(found?.id);
      if (saved) {
        if (!codeParam) setVoucherCode(saved.voucherCode);
        if (!serialParam) setSerialNumber(saved.serialNumber);
      }
    }

    if (stepParam && ["select", "voucher", "voucher-success", "login", "form", "done"].includes(stepParam)) {
      setStep(stepParam);
    }

    if (reference && (stepParam === "voucher-success" || !stepParam)) {
      void (async () => {
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(
            `/api/apply/voucher/verify?reference=${encodeURIComponent(reference)}`,
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Payment verification failed");
          setVoucherCode(data.voucher?.voucherCode || "");
          setSerialNumber(data.voucher?.serialNumber || "");
          if (data.voucher?.voucherCode && data.voucher?.serialNumber) {
            const sid =
              data.school?.id ||
              schools.find((s) => s.slug === data.school?.slug)?.id ||
              "";
            if (sid) {
              writeApplySession({
                schoolId: sid,
                schoolSlug: data.school?.slug,
                voucherCode: data.voucher.voucherCode,
                serialNumber: data.voucher.serialNumber,
              });
            }
          }
          setEmailSent(data.emailSent === true);
          setEmailError(
            data.emailSent ? null : data.emailError || "Could not send email",
          );
          setStep("voucher-success");
          if (data.school?.slug) {
            const found = schools.find((s) => s.slug === data.school.slug);
            if (found) setSchool(found);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Verification failed");
          setStep("voucher");
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [loadingSchools, schools, searchParams]);

  const selectSchool = (s: PartnerSchool) => {
    // Open the school profile (cut-offs, blog, buy voucher) before applying
    if (s.slug) {
      router.push(`/apply/school/${encodeURIComponent(s.slug)}`);
      return;
    }
    setSchool(s);
    setError(null);
    if (s.requiresVoucher) {
      setStep("voucher");
      router.replace(`/apply?school=${s.id}&step=voucher`);
    } else {
      setStep("login");
      router.replace(`/apply?school=${s.id}&step=login`);
    }
  };

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || busy) return;
    if (!programmeLevel) {
      setError("Please select Undergraduate or Postgraduate.");
      return;
    }
    const accountEmail = getStoredUserEmail();
    if (!accountEmail) {
      requireClientAuth(router);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/apply/voucher/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: buyerName,
          email: accountEmail,
          schoolId: school.id,
          programmeLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setBusy(false);
    }
  };

  const validateVoucherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school.id,
          voucherCode,
          serialNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid voucher");

      const code = String(data.voucher?.voucherCode || voucherCode).trim().toUpperCase();
      const serial = String(
        data.voucher?.serialNumber || serialNumber,
      ).trim().toUpperCase();
      setVoucherCode(code);
      setSerialNumber(serial);
      writeApplySession({
        schoolId: school.id,
        schoolSlug: school.slug,
        voucherCode: code,
        serialNumber: serial,
        email: buyerEmail || undefined,
      });

      // Returning students with an existing application go to their portal
      if (data.hasApplication) {
        const params = new URLSearchParams({
          schoolId: school.id,
          voucherCode: code,
          serialNumber: serial,
        });
        router.push(`/apply/portal?${params.toString()}`);
        return;
      }

      setStep("form");
      const params = new URLSearchParams({
        school: school.slug || school.id,
        step: "form",
        voucherCode: code,
        serialNumber: serial,
      });
      router.replace(`/apply?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  };

  const continueWithoutVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setStep("form");
    router.replace(`/apply?school=${school.slug || school.id}&step=form`);
  };

  const stepLabel = useMemo(() => {
    switch (step) {
      case "select":
        return "Select school";
      case "voucher":
        return "Purchase voucher";
      case "voucher-success":
        return "Voucher ready";
      case "login":
        return "Sign in";
      case "form":
        return "Application form";
      case "done":
        return "Submitted";
      default:
        return "";
    }
  }, [step]);

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </main>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-[#050816]"
      style={school ? brandThemeStyle(school.brandColor) : undefined}
    >
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start gap-3">
          {school?.logoSrc ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <Image
                src={school.logoSrc}
                alt={school.logoAlt || schoolLabel(school)}
                fill
                className="object-contain p-1.5"
              />
            </div>
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--school-brand,#007AFF)] text-white">
              <GraduationCap className="h-6 w-6" />
            </span>
          )}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="min-w-0">{school ? schoolLabel(school) : "Apply for admission"}</span>
              {school && (
                <BadgeCheck
                  className="h-6 w-6 shrink-0 text-[#007AFF]"
                  fill="currentColor"
                  stroke="white"
                  aria-label="Verified partner school"
                />
              )}
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              {school
                ? `${stepLabel}${school.alias && school.alias !== school.name ? ` · ${school.name}` : ""}`
                : stepLabel}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "select" && (
          <section className="space-y-4">
            <p className="text-sm text-[#4B5563]">
              Choose the school you want to apply to. Already bought a voucher?{" "}
              <Link href="/apply/portal" className="text-[var(--school-brand,#007AFF)] underline">
                Check status / edit form
              </Link>
              . Looking for public university vouchers?{" "}
              <Link href="/university-forms" className="text-[var(--school-brand,#007AFF)] underline">
                Buy university forms
              </Link>
              .
            </p>
            {loadingSchools ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--school-brand,#007AFF)]" />
              </div>
            ) : schools.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center text-sm text-[#6B7280]">
                No institutions are accepting applications yet.
              </div>
            ) : (
              <div className="w-full min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:p-4">
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.25rem] items-center gap-x-1.5 border-b border-gray-200/90 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--school-brand,#007AFF)] sm:hidden"
                  role="row"
                >
                  <span className="min-w-0 text-left">School</span>
                  <span className="text-right tabular-nums">Deadline</span>
                </div>
                <div
                  className="hidden sm:grid sm:min-w-0 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-center sm:gap-x-4 sm:border-b sm:border-gray-200/90 sm:px-1 sm:py-3 text-[11px] font-medium text-[var(--school-brand,#007AFF)] md:text-xs"
                  role="row"
                >
                  <span className="min-w-0 pl-2.5 text-left">School</span>
                  <span className="pr-2.5 text-right tabular-nums">Deadline</span>
                </div>
                <div className="flex flex-col gap-1">
                  {schools.map((s) => {
                    const expired = isDeadlineCalendarExpired(s.deadline ?? null);
                    const selected = school?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSchool(s)}
                        className={`group grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_5.25rem] items-center gap-x-1.5 px-2 py-2.5 text-left transition-all duration-150 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:gap-x-4 sm:px-2.5 sm:py-3.5 ${
                          selected
                            ? "rounded-2xl bg-[var(--school-brand,#007AFF)] px-2.5 text-white sm:px-3.5"
                            : "rounded-none bg-white hover:rounded-2xl hover:bg-[var(--school-brand,#007AFF)] hover:px-2.5 hover:text-white sm:hover:px-3.5 sm:hover:shadow-sm"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
                          <div
                            className={`relative h-5 w-5 shrink-0 overflow-hidden rounded-sm sm:h-7 sm:w-7 ${
                              selected ? "bg-white/95 p-0.5" : "group-hover:bg-white/95 sm:group-hover:p-0.5"
                            }`}
                          >
                            {s.logoSrc ? (
                              <Image
                                src={s.logoSrc}
                                alt={s.logoAlt || schoolLabel(s)}
                                width={32}
                                height={32}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[var(--school-brand,#007AFF)]">
                                <GraduationCap className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                          <SchoolListLabel
                            name={s.name}
                            alias={s.alias}
                            className={`min-w-0 text-left text-[13px] font-medium leading-none sm:text-sm sm:leading-snug sm:break-words sm:[overflow-wrap:anywhere] ${
                              selected
                                ? "text-white"
                                : "text-[#1E1E1E] group-hover:text-white"
                            }`}
                          />
                          <BadgeCheck
                            className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${
                              selected ? "text-white" : "text-[#007AFF] group-hover:text-white"
                            }`}
                            fill="currentColor"
                            stroke="white"
                            aria-label="Verified partner school"
                          />
                        </div>
                        <span
                          className={`w-full text-right text-[11px] font-medium tabular-nums leading-none sm:text-sm ${
                            selected
                              ? expired
                                ? "text-red-100"
                                : "text-white"
                              : expired
                                ? "text-red-600 group-hover:text-red-100"
                                : "text-[#1E1E1E] group-hover:text-white"
                          }`}
                        >
                          {expired ? (
                            <>
                              <span className="sm:hidden">Expired</span>
                              <span className="hidden sm:inline">
                                {formatDeadline(s.deadline)}
                              </span>
                            </>
                          ) : (
                            formatDeadline(s.deadline)
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {step === "voucher" && school && (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setStep("select");
                setSchool(null);
                router.replace("/apply");
              }}
              className="mb-4 inline-flex items-center gap-1 text-sm text-[#6B7280]"
            >
              <ChevronLeft className="h-4 w-4" /> Change school
            </button>
            <h2 className="text-lg font-semibold">Purchase admission voucher</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {schoolLabel(school)}
              {programmeLevel
                ? ` · ${PROGRAMME_LEVEL_LABELS[programmeLevel]} · GHS ${
                    (programmeLevel === "postgraduate"
                      ? school.postgraduateVoucherPrice
                      : school.undergraduateVoucherPrice) ??
                    school.voucherPrice ??
                    "—"
                  }`
                : ` · select a level to see price`}
            </p>
            <form onSubmit={startPayment} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Full name</span>
                <input
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Email</span>
                <input
                  required
                  type="email"
                  value={buyerEmail}
                  readOnly
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[#4B5563] outline-none"
                />
                <span className="text-xs text-[#6B7280]">
                  Voucher will be linked to your TertiaryGuide account.
                </span>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Programme level</span>
                <select
                  required
                  value={programmeLevel}
                  onChange={(e) =>
                    setProgrammeLevel(e.target.value as ProgrammeLevel | "")
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                >
                  <option value="">Select Undergraduate or Postgraduate</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="postgraduate">Postgraduate</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white sm:col-span-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Pay with Paystack
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-[#9CA3AF]">
              Already have a voucher?{" "}
              <button
                type="button"
                className="text-[var(--school-brand,#007AFF)] underline"
                onClick={() => setStep("login")}
              >
                Login with voucher
              </button>
            </p>
          </section>
        )}

        {step === "voucher-success" && (
          <section className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Payment successful</h2>
            </div>
            <p className="mt-2 text-sm text-[#6B7280]">
              Your voucher has been generated. Save these details and continue to the form.
            </p>
            {emailSent === true && (
              <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
                Voucher code and serial were also sent to your email.
              </p>
            )}
            {emailSent === false && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                We could not send the email{emailError ? `: ${emailError}` : ""}.
                Please save the code and serial below.
              </p>
            )}
            <div className="mt-4 rounded-2xl bg-[#F3F4F6] p-4 font-mono text-sm">
              <p>
                <strong>Serial Number:</strong> {serialNumber}
              </p>
              <p className="mt-2">
                <strong>PIN:</strong> {voucherCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("login")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Continue to login <ChevronRight className="h-4 w-4" />
            </button>
            <p className="mt-4 text-sm text-[#6B7280]">
              These details are also saved in your{" "}
              <Link
                href="/dashboard/my-forms"
                className="text-[var(--school-brand,#007AFF)] underline"
              >
                profile → My Forms
              </Link>
              . You can return anytime at{" "}
              <Link href="/apply/portal" className="text-[var(--school-brand,#007AFF)] underline">
                /apply/portal
              </Link>{" "}
              with the same voucher credentials.
            </p>
          </section>
        )}

        {step === "login" && school && (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              {school.requiresVoucher ? "Login with voucher" : "Continue application"}
            </h2>
            {school.requiresVoucher ? (
              <form onSubmit={validateVoucherLogin} className="mt-6 grid gap-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Serial number</span>
                  <input
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono outline-none focus:border-[var(--school-brand,#007AFF)]"
                    placeholder="TG-2026-001234"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">PIN</span>
                  <input
                    required
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono outline-none focus:border-[var(--school-brand,#007AFF)]"
                    placeholder="HS-8K7D-29PX"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Validating…" : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={continueWithoutVoucher} className="mt-6 grid gap-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Email</span>
                  <input
                    required
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Password (optional if new)</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Continue to form
                </button>
              </form>
            )}
          </section>
        )}

        {step === "form" && school && (
          <MultiStepApplicationForm
            schoolId={school.id}
            schoolName={schoolLabel(school)}
            schoolSlug={school.slug}
            voucherCode={voucherCode || undefined}
            serialNumber={serialNumber || undefined}
            loginEmail={!school.requiresVoucher ? loginEmail : undefined}
            loginPassword={!school.requiresVoucher ? loginPassword : undefined}
            initialEmail={buyerEmail || loginEmail || undefined}
            onSubmitted={(result) => {
              setSubmitted({
                applicationNumber: result.applicationNumber,
                schoolName: result.schoolName,
              });
              setStep("done");
            }}
          />
        )}

        {step === "done" && submitted && (
          <section className="rounded-3xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-4 text-xl font-semibold">Application submitted</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Your application to{" "}
              {school ? schoolLabel(school) : submitted.schoolName} has been received.
            </p>
            <p className="mt-4 font-mono text-lg font-semibold text-[var(--school-brand,#007AFF)]">
              {submitted.applicationNumber}
            </p>
            <p className="mt-2 text-xs text-[#9CA3AF]">
              A confirmation email has been sent to you. To check status or edit later,
              visit{" "}
              <Link href="/apply/portal" className="text-[var(--school-brand,#007AFF)] underline">
                /apply/portal
              </Link>{" "}
              and log in with your voucher.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/apply/portal"
                className="inline-flex rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Open my application portal
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-full border border-[#E5E7EB] px-5 py-2.5 text-sm font-semibold"
              >
                Back to home
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
