"use client";

import Link from "next/link";
import {
  studentStatusBadgeClass,
  studentStatusCopy,
} from "@/lib/admissions/status-messages";

export function ApplicationStatusCard({
  status,
  schoolName,
  reviewNotes,
  compact = false,
}: {
  status: string;
  schoolName?: string | null;
  reviewNotes?: string | null;
  compact?: boolean;
}) {
  const copy = studentStatusCopy(status);
  const toneClass =
    copy.tone === "success"
      ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white"
      : copy.tone === "info"
        ? "border-sky-100 bg-gradient-to-br from-sky-50 to-white"
        : copy.tone === "care"
          ? "border-amber-100 bg-gradient-to-br from-[#FFFBEB] to-white"
          : "border-[#EEF2F7] bg-[#F8FAFC]";

  return (
    <div className={`rounded-[24px] border p-4 sm:p-5 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${studentStatusBadgeClass(status)}`}
        >
          {copy.badge}
        </span>
        {schoolName ? (
          <span className="text-xs font-medium text-[#64748B]">{schoolName}</span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-[#0F172A]">
        {copy.title}
      </h3>
      <p
        className={`mt-2 text-sm leading-relaxed text-[#475569] ${compact ? "line-clamp-4" : ""}`}
      >
        {copy.message}
      </p>
      {reviewNotes ? (
        <p className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-sm text-[#334155]">
          <span className="font-semibold">A note from the school: </span>
          {reviewNotes}
        </p>
      ) : null}
      {copy.tone === "care" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/apply"
            className="inline-flex items-center rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0062CC]"
          >
            Explore other schools
          </Link>
          <Link
            href="/university-forms"
            className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#334155]"
          >
            Browse more forms
          </Link>
        </div>
      ) : null}
    </div>
  );
}
