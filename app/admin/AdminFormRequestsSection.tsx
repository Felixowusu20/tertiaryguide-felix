"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Inbox,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  School,
  Search,
  UserRound,
} from "lucide-react";
import * as XLSX from "xlsx";

type AdminFormRequestRow = {
  id: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  institutionName: string;
  message: string | null;
  source: string | null;
  createdAt: string;
};

export function AdminFormRequestsSection() {
  const [requests, setRequests] = useState<AdminFormRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const normalizeText = (value: string | null | undefined) =>
    (value || "").replace(/\s+/g, " ").trim().toLowerCase();

  const load = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch("/api/admin/form-requests");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load form requests");
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setError("Could not load form requests. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const schoolCompare = a.institutionName.localeCompare(
        b.institutionName,
        undefined,
        { sensitivity: "base" },
      );
      if (schoolCompare !== 0) {
        return schoolCompare;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedRequests;

    const queryParts = normalizeText(q).split(" ").filter(Boolean);

    return sortedRequests.filter((r) => {
      const fields = [
        r.institutionName,
        r.requesterName,
        r.requesterEmail || "",
        r.requesterPhone || "",
        r.message || "",
        r.source || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      return queryParts.every((part) => fields.includes(part));
    });
  }, [sortedRequests, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, filtered.length]);

  function handleExportExcel() {
    try {
      setExporting(true);

      const rows = filtered.map((request) => ({
        School: request.institutionName,
        Requester: request.requesterName,
        Email: request.requesterEmail || "",
        Phone: request.requesterPhone || "",
        Message: request.message?.trim() || "",
        Source: request.source || "",
        "Requested At": new Date(request.createdAt).toLocaleString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Form Requests");

      const safeDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `form-requests-${safeDate}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Form requests</span>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#007AFF] shadow-sm ring-1 ring-[#DBEAFE]">
                <School className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
                Form requests
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              When someone asks for a school that is not yet listed, their
              request appears here. Schools are sorted alphabetically in the
              table and in the Excel download.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-white/90 px-4 py-2 text-xs font-medium text-[#1D4ED8] shadow-sm">
            <Inbox className="h-3.5 w-3.5" />
            {loading ? "Loading…" : `${requests.length} total`}
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 rounded-3xl border border-[#DBEAFE] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search school, requester, email, phone, or message"
            className="w-full rounded-full border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-4 text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || refreshing}
            onClick={() => void load(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#111827] transition hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || filtered.length === 0 || exporting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Download Excel"}
          </button>
        </div>
      </section>

      <section className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-[#DBEAFE] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#EFF6FF] text-left text-sm">
            <thead className="bg-[#F8FBFF] text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5" />
                    School
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    Requester
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Contact
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    Message
                  </span>
                </th>
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Requested
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3 w-32 rounded bg-[#E5E7EB]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-24 rounded bg-[#E5E7EB]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-36 rounded bg-[#E5E7EB]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-40 rounded bg-[#E5E7EB]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-24 rounded bg-[#E5E7EB]" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-[#DC2626]">{error}</p>
                      <button
                        type="button"
                        onClick={() => void load()}
                        className="rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#1D4ED8] hover:bg-[#F8FBFF]"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                        <Inbox className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-medium text-[#111827]">
                        {search
                          ? "No requests match your search"
                          : "No form requests yet"}
                      </p>
                      <p className="max-w-sm text-xs text-[#6B7280]">
                        {search
                          ? "Try a different school, requester, or contact."
                          : "When someone requests a school that is not yet listed, it will appear here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((request) => (
                  <tr
                    key={request.id}
                    className="align-top transition-colors hover:bg-[#F8FBFF]"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className="font-semibold text-[#111827]"
                        title={request.institutionName}
                      >
                        {request.institutionName}
                      </span>
                      {request.source && (
                        <p className="mt-0.5 text-xs text-[#9CA3AF]">
                          via {request.source}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#111827]">
                      {request.requesterName}
                    </td>
                    <td className="px-5 py-3.5 text-[#4B5563]">
                      <div className="max-w-[240px] space-y-1 break-words leading-5">
                        {request.requesterEmail && (
                          <p className="inline-flex items-center gap-1.5">
                            <Mail className="h-3 w-3 flex-shrink-0 text-[#9CA3AF]" />
                            {request.requesterEmail}
                          </p>
                        )}
                        {request.requesterPhone && (
                          <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
                            <Phone className="h-3 w-3 flex-shrink-0 text-[#9CA3AF]" />
                            {request.requesterPhone}
                          </p>
                        )}
                        {!request.requesterEmail &&
                          !request.requesterPhone &&
                          "—"}
                      </div>
                    </td>
                    <td className="max-w-sm break-words px-5 py-3.5 leading-6 text-[#4B5563]">
                      {request.message?.trim() ? request.message : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#6B7280]">
                      {new Date(request.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
