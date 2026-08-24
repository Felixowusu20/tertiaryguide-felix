"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { ApplicationDocuments } from "@/app/components/ApplicationDocuments";
import { ApplicationStatusCard } from "@/app/components/ApplicationStatusCard";
import { ProgrammeChoicesList } from "@/app/components/ProgrammeChoicesList";
import { writeApplySession } from "@/lib/admissions/applicant-session";
import {
  listProgrammeChoices,
  type RankedProgrammeChoice,
} from "@/lib/admissions/programme-choices";

type Purchase = {
  id: string;
  type: "university_form" | "partner_voucher";
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  schoolSlug?: string | null;
  date: string;
  voucher?: { serial: string; pin: string } | null;
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    programmes?: RankedProgrammeChoice[];
    programme?: string | null;
    detail?: {
      programmeChoices?: Record<string, string | undefined> | null;
      documents?: Record<string, string | undefined> | null;
    };
  } | null;
};

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

export default function MyApplicationsPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = window.localStorage.getItem("tg_user_email");
    if (!email) {
      router.replace(
        `/signin?redirect=${encodeURIComponent("/dashboard/my-applications")}`,
      );
      return;
    }

    const userEmail = email;

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/user/purchases?email=${encodeURIComponent(userEmail)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load applications");
        if (!cancelled) {
          setPurchases(
            (data.purchases || []).filter(
              (p: Purchase) =>
                p.type === "partner_voucher" || Boolean(p.application),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load applications",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const applications = useMemo(
    () =>
      purchases.filter(
        (p) => p.application || p.type === "partner_voucher",
      ),
    [purchases],
  );

  async function openPortal(purchase: Purchase) {
    if (!purchase.schoolId || !purchase.voucher) {
      if (purchase.schoolSlug) {
        router.push(`/apply/school/${encodeURIComponent(purchase.schoolSlug)}`);
      }
      return;
    }
    setOpeningId(purchase.id);
    setError(null);
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
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
        <p className="text-sm text-[#555555]">Loading your applications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1E1E1E] sm:text-3xl">
          My Applications
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Track admission progress, status, and downloaded documents.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center rounded-[28px] border border-[#E8EEF5] bg-white px-6 py-16 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF6FF]">
            <GraduationCap className="h-7 w-7 text-[#007AFF]" />
          </span>
          <h2 className="text-lg font-semibold text-[#1E1E1E]">
            No applications yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[#555555]">
            Direct applications to partner schools will show here with live
            admission status.
          </p>
          <Link
            href="/apply"
            className="mt-6 rounded-full bg-[#007AFF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0062CC]"
          >
            Start an application
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {applications.map((purchase) => (
            <article
              key={purchase.id}
              className="overflow-hidden rounded-[28px] border border-[#E8EEF5] bg-white"
            >
              <div className="flex items-center gap-3 border-b border-[#EEF2F7] px-5 py-4 sm:px-6">
                {purchase.schoolLogo ? (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#E5E7EB]">
                    <Image
                      src={purchase.schoolLogo}
                      alt=""
                      fill
                      className="object-contain p-1"
                    />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF6FF] text-[#007AFF]">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-[#0F172A]">
                    {purchase.schoolName || "Partner school"}
                  </h2>
                  <p className="truncate text-xs text-[#64748B]">
                    {purchase.application?.applicationNumber
                      ? purchase.application.applicationNumber
                      : "Application not submitted yet"}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <ApplicationStatusCard
                  status={purchase.application?.status || "Pending"}
                  schoolName={purchase.schoolName}
                  compact
                />
                <ProgrammeChoicesList
                  title="Programme choices"
                  programmes={programmesFor(purchase)}
                  columns={2}
                />
                <ApplicationDocuments
                  documents={purchase.application?.detail?.documents}
                  applicationNumber={purchase.application?.applicationNumber}
                />
                <button
                  type="button"
                  onClick={() => void openPortal(purchase)}
                  disabled={openingId === purchase.id}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0062CC] disabled:opacity-60 sm:w-auto"
                >
                  {openingId === purchase.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Open application portal"
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
