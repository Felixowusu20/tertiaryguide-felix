"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, Megaphone } from "lucide-react";
import * as XLSX from "xlsx";

type ReportRow = {
  kind: "ad" | "explore";
  assetId: string;
  title: string;
  campaignName: string;
  advertiserName: string;
  advertiserEmail: string;
  placement: string;
  impressions: number;
  views: number;
  clicks: number;
  ctr: number;
  likes?: number;
  comments?: number;
};

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminAdReportsSection() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [advertiserEmail, setAdvertiserEmail] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState({
    impressions: 0,
    views: 0,
    clicks: 0,
    ctr: 0,
    campaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      from: new Date(`${from}T00:00:00.000Z`).toISOString(),
      to: new Date(`${to}T23:59:59.999Z`).toISOString(),
    });
    if (advertiserEmail.trim()) {
      params.set("advertiserEmail", advertiserEmail.trim());
    }
    return params.toString();
  }, [from, to, advertiserEmail]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/ad-reports?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotals(
        data.totals || {
          impressions: 0,
          views: 0,
          clicks: 0,
          ctr: 0,
          campaigns: 0,
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleDownload() {
    const sheet = rows.map((row) => ({
      Type: row.kind === "ad" ? "Homepage / blog ad" : "Explore post",
      Title: row.title,
      Campaign: row.campaignName,
      Advertiser: row.advertiserName,
      Email: row.advertiserEmail,
      Location: row.placement,
      Impressions: row.impressions,
      Views: row.views,
      Clicks: row.clicks,
      "CTR (%)": row.ctr,
      Likes: row.likes ?? "",
      Comments: row.comments ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
    XLSX.writeFile(workbook, `tertiaryguide-ad-report-${from}-to-${to}.xlsx`);
  }

  async function sendReports(sendAll: boolean) {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/ad-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: new Date(`${from}T00:00:00.000Z`).toISOString(),
          to: new Date(`${to}T23:59:59.999Z`).toISOString(),
          advertiserEmail: sendAll ? undefined : advertiserEmail.trim(),
          sendAll,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      const failed = Array.isArray(data.failed) ? data.failed.length : 0;
      setNotice(
        `Sent ${data.sent || 0} report${data.sent === 1 ? "" : "s"}${
          failed ? `, ${failed} failed` : ""
        }.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send report");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Ad reports</span>
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#007AFF] shadow-sm ring-1 ring-[#DBEAFE]">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
              Advertising reports
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              Track impressions, views, clicks, and CTR for homepage ads, blog
              promos, and Explore photos/videos. Download an Excel file or email
              it to the advertiser. Visitor emails and IPs are not stored.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 space-y-4 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-[#4B5563]">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-[#4B5563]">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-[#4B5563] sm:col-span-2">
            Advertiser email (optional filter)
            <input
              type="email"
              value={advertiserEmail}
              onChange={(e) => setAdvertiserEmail(e.target.value)}
              placeholder="owner@school.edu.gh"
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => void sendReports(false)}
            disabled={sending || !advertiserEmail.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0062CC] disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Email this advertiser
          </button>
          <button
            type="button"
            onClick={() => void sendReports(true)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#007AFF]/30 bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] disabled:opacity-50"
          >
            Email all advertisers
          </button>
        </div>
        {notice ? <p className="text-sm text-[#166534]">{notice}</p> : null}
        {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Impressions", totals.impressions],
          ["Views", totals.views],
          ["Clicks", totals.clicks],
          ["CTR", `${totals.ctr}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
          >
            <p className="text-xs text-[#6B7280]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[#111827]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <p className="p-4 text-sm text-[#6B7280]">Loading report…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-[#6B7280]">
            No tracked activity in this range. Add an advertiser email on an ad
            or Explore post, then wait for public impressions and clicks.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs sm:text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Asset</th>
                  <th className="px-3 py-2.5 font-medium">Advertiser</th>
                  <th className="px-3 py-2.5 font-medium">Location</th>
                  <th className="px-3 py-2.5 font-medium">Impr.</th>
                  <th className="px-3 py-2.5 font-medium">Views</th>
                  <th className="px-3 py-2.5 font-medium">Clicks</th>
                  <th className="px-3 py-2.5 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.assetId}-${row.placement}`}>
                    <td className="max-w-[240px] px-3 py-2.5">
                      <p className="font-medium text-[#111827]">{row.title}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {row.kind === "ad" ? "Ad" : "Explore"}
                        {row.campaignName ? ` · ${row.campaignName}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155]">
                      <p>{row.advertiserName || "—"}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {row.advertiserEmail || "No email yet"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-[#334155]">
                      {row.placement}
                    </td>
                    <td className="px-3 py-2.5">{row.impressions}</td>
                    <td className="px-3 py-2.5">{row.views}</td>
                    <td className="px-3 py-2.5">{row.clicks}</td>
                    <td className="px-3 py-2.5">{row.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
