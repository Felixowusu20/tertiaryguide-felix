"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { ApplicationDocuments } from "@/app/components/ApplicationDocuments";
import {
  studentStatusBadgeClass,
  studentStatusCopy,
} from "@/lib/admissions/status-messages";
import { APPLICATION_STATUSES } from "@/lib/admissions/types";

type AdminApplicationRow = {
  id: string;
  applicationNumber: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  programme: string | null;
  status: string;
  submittedAt: string;
  documents?: Record<string, string | undefined> | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminApplicationsSection() {
  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<AdminApplicationRow | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await adminFetch("/api/admin/applications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load applications");
      setRows(Array.isArray(data.applications) ? data.applications : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load applications.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "All" || row.status === status;
      if (!matchesStatus) return false;
      if (!q) return true;
      const hay = `${row.fullName} ${row.email} ${row.phone ?? ""} ${row.applicationNumber} ${row.schoolName} ${row.programme ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows, status]);

  return (
    <section className="rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Applications</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Track partner-school admissions across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#EFF6FF] disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applicant, school, or number"
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#007AFF] focus:bg-white"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#007AFF]"
        >
          <option value="All">All statuses</option>
          {APPLICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
        </div>
      ) : error ? (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-12 text-center">
          <GraduationCap className="h-8 w-8 text-[#007AFF]/50" />
          <p className="mt-3 text-sm font-medium text-[#374151]">
            No applications found
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <tr className="border-b border-[#E5E7EB]">
                <th className="py-3 pr-4">Applicant</th>
                <th className="py-3 pr-4">School</th>
                <th className="py-3 pr-4">Programme</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Submitted</th>
                <th className="py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-[#F3F4F6]">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-[#111827]">{row.fullName}</p>
                    <p className="text-xs text-[#6B7280]">
                      {row.applicationNumber}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-[#374151]">{row.schoolName}</td>
                  <td className="py-3 pr-4 text-[#374151]">
                    {row.programme || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${studentStatusBadgeClass(row.status)}`}
                    >
                      {studentStatusCopy(row.status).badge}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#6B7280]">
                    {formatDate(row.submittedAt)}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="text-xs font-semibold text-[#007AFF] hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <button
            type="button"
            className="h-full flex-1"
            aria-label="Close"
            onClick={() => setSelected(null)}
          />
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="font-semibold text-[#111827]">{selected.fullName}</h3>
                <p className="text-xs text-[#6B7280]">
                  {selected.applicationNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm text-[#6B7280]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <p>
                <strong>School:</strong> {selected.schoolName}
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
              <p>
                <strong>Status:</strong> {studentStatusCopy(selected.status).badge}
              </p>
              <ApplicationDocuments
                documents={selected.documents}
                applicationNumber={selected.applicationNumber}
              />
              {selected.schoolSlug ? (
                <Link
                  href={`/admin/${encodeURIComponent(selected.schoolSlug)}?tab=applicants`}
                  className="inline-flex rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0062CC]"
                >
                  Open school portal
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
