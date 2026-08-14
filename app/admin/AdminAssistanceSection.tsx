"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Headset,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";

type AssistanceMedium = "call" | "sms" | "whatsapp" | "email";

type AdminAssistanceRequest = {
  id: string;
  medium: AssistanceMedium;
  contact: string;
  requesterEmail?: string | null;
  requesterUsername?: string | null;
  createdAt: string;
};

const MEDIUM_STYLES: Record<
  AssistanceMedium,
  { label: string; className: string; Icon: typeof Phone }
> = {
  call: {
    label: "Call",
    className: "bg-[#DBEAFE] text-[#1D4ED8]",
    Icon: Phone,
  },
  sms: {
    label: "SMS",
    className: "bg-[#EDE9FE] text-[#6D28D9]",
    Icon: MessageSquareText,
  },
  whatsapp: {
    label: "WhatsApp",
    className: "bg-[#DCFCE7] text-[#15803D]",
    Icon: MessageCircle,
  },
  email: {
    label: "Email",
    className: "bg-[#FEF3C7] text-[#B45309]",
    Icon: Mail,
  },
};

function MediumBadge({ medium }: { medium: AssistanceMedium }) {
  const style = MEDIUM_STYLES[medium] ?? MEDIUM_STYLES.call;
  const Icon = style.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.className}`}
    >
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

function requesterLabel(r: AdminAssistanceRequest) {
  const u = r.requesterUsername?.trim();
  if (u) return u;
  if (r.requesterEmail) return r.requesterEmail;
  return "—";
}

export function AdminAssistanceSection() {
  const [requests, setRequests] = useState<AdminAssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch("/api/admin/assistance");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load assistance requests");
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setError("Could not load assistance requests. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const contact = r.contact.toLowerCase();
      const medium = r.medium.toLowerCase();
      const un = (r.requesterUsername || "").toLowerCase();
      const em = (r.requesterEmail || "").toLowerCase();
      return (
        contact.includes(q) ||
        medium.includes(q) ||
        un.includes(q) ||
        em.includes(q)
      );
    });
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, filtered.length]);

  return (
    <>
      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Assistance</span>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#007AFF] shadow-sm ring-1 ring-[#DBEAFE]">
                <Headset className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
                Assistance requests
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              People who asked to be contacted for help, along with how they
              prefer to be reached.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-white/90 px-4 py-2 text-xs font-medium text-[#1D4ED8] shadow-sm">
            <LifeBuoy className="h-3.5 w-3.5" />
            {loading ? "Loading…" : `${requests.length} total`}
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 rounded-3xl border border-[#DBEAFE] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by user, contact, or medium"
            className="w-full rounded-full border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-4 text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </label>
        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => void load(true)}
          className="inline-flex w-fit items-center justify-center gap-1.5 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#111827] transition hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </section>

      <section className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-[#DBEAFE] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1.6fr_1fr_1.4fr_1.2fr] items-center border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] sm:px-6">
              <span>User</span>
              <span>Medium</span>
              <span>Contact</span>
              <span className="text-right">Requested</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#F1F5F9]">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid animate-pulse grid-cols-[1.6fr_1fr_1.4fr_1.2fr] items-center px-4 py-4 sm:px-6"
                  >
                    <div className="h-3 w-28 rounded bg-[#E5E7EB]" />
                    <div className="h-5 w-20 rounded-full bg-[#E5E7EB]" />
                    <div className="h-3 w-32 rounded bg-[#E5E7EB]" />
                    <div className="ml-auto h-3 w-24 rounded bg-[#E5E7EB]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-sm text-[#DC2626]">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#1D4ED8] hover:bg-[#F8FBFF]"
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Headset className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#111827]">
                  {search
                    ? "No requests match your search"
                    : "No assistance requests yet"}
                </p>
                <p className="max-w-sm text-xs text-[#6B7280]">
                  {search
                    ? "Try a different name, contact, or medium."
                    : "When someone asks to be contacted for help, their request will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] text-sm text-[#111827]">
                {paginated.map((request) => (
                  <div
                    key={request.id}
                    className="grid grid-cols-[1.6fr_1fr_1.4fr_1.2fr] items-center px-4 py-3.5 transition-colors hover:bg-[#F8FBFF] sm:px-6"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-medium">
                        {requesterLabel(request)}
                      </p>
                      {request.requesterUsername && request.requesterEmail && (
                        <p className="truncate text-xs text-[#9CA3AF]">
                          {request.requesterEmail}
                        </p>
                      )}
                    </div>
                    <div>
                      <MediumBadge medium={request.medium} />
                    </div>
                    <span className="truncate pr-3 text-[#4B5563]">
                      {request.contact}
                    </span>
                    <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs text-[#6B7280]">
                      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF]" />
                      {new Date(request.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#F1F5F9] px-4 py-3 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="min-w-0">
              Showing{" "}
              <span className="font-medium text-[#111827]">
                {Math.min(filtered.length, (page - 1) * pageSize + 1)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-[#111827]">
                {Math.min(filtered.length, page * pageSize)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#111827]">
                {filtered.length}
              </span>{" "}
              request{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#111827] transition hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:hover:bg-white"
              >
                Previous
              </button>
              <span>
                Page <span className="font-medium text-[#111827]">{page}</span>{" "}
                of{" "}
                <span className="font-medium text-[#111827]">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#111827] transition hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
