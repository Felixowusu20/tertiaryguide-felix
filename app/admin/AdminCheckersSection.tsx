"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";

type CheckerStatus = "Issued" | "Unissued";

type AdminChecker = {
  id: string;
  serial: string;
  pin: string;
  status: CheckerStatus;
  issuedTo: string;
  issuedAt: string;
};

type CheckerPayment = {
  id: string;
  reference: string;
  email: string;
  fullName: string | null;
  amount: number;
  currency: string;
  status: string;
  quantity: number;
  issuedCount: number;
  paidAt: string;
};

export function AdminCheckersSection() {
  const [checkers, setCheckers] = useState<AdminChecker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<
    "checkers" | "payments" | "page"
  >("checkers");

  const [pagePrice, setPagePrice] = useState("25");
  const [pageTitle, setPageTitle] = useState(
    "Steps to get a\nWASSCE voucher",
  );
  const [pageSteps, setPageSteps] = useState<string[]>([
    "Enter your name and email",
    "Make payment of GHS {price}",
    "Your PIN will be sent instantly",
  ]);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageSaving, setPageSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [payments, setPayments] = useState<CheckerPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPageSize = 10;
  const [paymentsFulfilmentFilter, setPaymentsFulfilmentFilter] = useState<
    "all" | "pending" | "fulfilled"
  >("all");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "Issued" | "Unissued"
  >("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newSerial, setNewSerial] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newStatus, setNewStatus] = useState<CheckerStatus>("Unissued");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    inserted: number;
    totalParsed: number;
    droppedDuplicateInFile: number;
    skippedAlreadyInDatabase: number;
    message?: string;
  } | null>(null);

  const [selectedCheckerIds, setSelectedCheckerIds] = useState<string[]>([]);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  const filteredCheckers = useMemo(
    () =>
      checkers.filter((checker) => {
        if (statusFilter === "all") return true;
        return checker.status === statusFilter;
      }),
    [checkers, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCheckers.length / pageSize));

  const paginatedCheckers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCheckers.slice(start, start + pageSize);
  }, [filteredCheckers, currentPage]);

  const allOnPageSelected = useMemo(() => {
    if (paginatedCheckers.length === 0) return false;
    return paginatedCheckers.every((c) => selectedCheckerIds.includes(c.id));
  }, [paginatedCheckers, selectedCheckerIds]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, checkers.length]);

  useEffect(() => {
    setSelectedCheckerIds([]);
  }, [statusFilter]);

  const pendingPaymentCount = useMemo(
    () =>
      payments.filter(
        (p) => p.status === "success" && p.issuedCount < p.quantity,
      ).length,
    [payments],
  );

  const fetchPayments = React.useCallback(async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError(null);

      const res = await fetch("/api/admin/checkers/payments");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load payments");
      }

      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch {
      setPaymentsError("Could not load payments. Please try again.");
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const fetchPageSettings = React.useCallback(async () => {
    try {
      setPageLoading(true);
      setPageError(null);
      const res = await adminFetch("/api/admin/wassce-settings");
      const data = await res.json();
      if (!res.ok) {
        setPageError(data.error || "Failed to load page settings");
        return;
      }
      if (data.settings) {
        setPagePrice(String(data.settings.priceGhs ?? 25));
        setPageTitle(
          typeof data.settings.title === "string"
            ? data.settings.title
            : "Steps to get a\nWASSCE voucher",
        );
        setPageSteps(
          Array.isArray(data.settings.steps) && data.settings.steps.length > 0
            ? data.settings.steps
            : [
                "Enter your name and email",
                "Make payment of GHS {price}",
                "Your PIN will be sent instantly",
              ],
        );
      }
    } catch {
      setPageError("Failed to load page settings");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "page") {
      void fetchPageSettings();
    }
  }, [activeView, fetchPageSettings]);

  async function savePageSettings() {
    try {
      setPageSaving(true);
      setPageError(null);
      setPageMessage(null);
      const price = Number(pagePrice);
      if (!Number.isFinite(price) || price <= 0) {
        setPageError("Price must be a positive number.");
        return;
      }
      const cleanedSteps = pageSteps.map((s) => s.trim()).filter(Boolean);
      if (cleanedSteps.length === 0) {
        setPageError("Add at least one step.");
        return;
      }

      const res = await adminFetch("/api/admin/wassce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceGhs: price,
          title: pageTitle.trim(),
          steps: cleanedSteps,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPageError(data.error || "Could not save settings.");
        return;
      }
      if (data.settings) {
        setPagePrice(String(data.settings.priceGhs));
        setPageTitle(data.settings.title);
        setPageSteps(data.settings.steps);
      }
      setPageMessage(
        "WASSCE checker page settings saved. Live on /wassce-checker.",
      );
    } catch {
      setPageError("Could not save settings. Please try again.");
    } finally {
      setPageSaving(false);
    }
  }

  const filteredPayments = useMemo(() => {
    const query = paymentsSearch.trim().toLowerCase();

    let list = payments;
    if (paymentsFulfilmentFilter === "pending") {
      list = list.filter(
        (p) => p.status === "success" && p.issuedCount < p.quantity,
      );
    } else if (paymentsFulfilmentFilter === "fulfilled") {
      list = list.filter((p) => p.issuedCount >= p.quantity);
    }

    if (!query) return list;

    return list.filter((payment) => {
      const name = (payment.fullName || "").toLowerCase();
      const email = payment.email.toLowerCase();
      const reference = payment.reference.toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        reference.includes(query)
      );
    });
  }, [payments, paymentsSearch, paymentsFulfilmentFilter]);

  const paymentsTotalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / paymentsPageSize),
  );

  const paginatedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * paymentsPageSize;
    return filteredPayments.slice(start, start + paymentsPageSize);
  }, [filteredPayments, paymentsPage]);

  React.useEffect(() => {
    setPaymentsPage(1);
  }, [paymentsSearch, paymentsFulfilmentFilter, filteredPayments.length]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/checkers");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load checkers");
        }

        if (!cancelled) {
          setCheckers(Array.isArray(data.checkers) ? data.checkers : []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load checkers. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (addOpen) return;
    setBulkError(null);
    setBulkResult(null);
  }, [addOpen]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  async function handleRefreshCheckers() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/checkers");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load checkers");
      }
      setCheckers(Array.isArray(data.checkers) ? data.checkers : []);
    } catch {
      setError("Could not load checkers. Please try again.");
    } finally {
      setLoading(false);
    }
    void fetchPayments();
  }

  function handleRefreshPayments() {
    void fetchPayments();
    setActiveView("payments");
  }

  async function handleBulkFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBulkError(null);
    setBulkResult(null);
    setBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/checkers/bulk", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(
          typeof data.error === "string" ? data.error : "Import failed.",
        );
        return;
      }
      setBulkResult({
        inserted: data.inserted ?? 0,
        totalParsed: data.totalParsed ?? 0,
        droppedDuplicateInFile: data.droppedDuplicateInFile ?? 0,
        skippedAlreadyInDatabase: data.skippedAlreadyInDatabase ?? 0,
        message: typeof data.message === "string" ? data.message : undefined,
      });
      await handleRefreshCheckers();
    } catch {
      setBulkError("Upload failed. Please try again.");
    } finally {
      setBulkUploading(false);
    }
  }

  function toggleCheckerSelect(id: string) {
    setSelectedCheckerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAllOnPage() {
    const pageIds = paginatedCheckers.map((c) => c.id);
    if (pageIds.length === 0) return;
    setSelectedCheckerIds((prev) => {
      const all = pageIds.every((id) => prev.includes(id));
      if (all) return prev.filter((id) => !pageIds.includes(id));
      return [...new Set([...prev, ...pageIds])];
    });
  }

  async function handleDeleteOne(checker: AdminChecker) {
    if (
      !window.confirm(
        `Delete this checker (serial: ${checker.serial})? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      setDeleteInProgress(true);
      const res = await fetch(`/api/admin/checkers/${checker.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not delete checker.");
        return;
      }
      setCheckers((prev) => prev.filter((c) => c.id !== checker.id));
      setSelectedCheckerIds((prev) => prev.filter((x) => x !== checker.id));
    } catch {
      window.alert("Could not delete checker. Please try again.");
    } finally {
      setDeleteInProgress(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedCheckerIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedCheckerIds.length} selected checker(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    const ids = [...selectedCheckerIds];
    try {
      setDeleteInProgress(true);
      const res = await fetch("/api/admin/checkers/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not delete checkers.");
        return;
      }
      setCheckers((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedCheckerIds([]);
    } catch {
      window.alert("Could not delete checkers. Please try again.");
    } finally {
      setDeleteInProgress(false);
    }
  }

  return (
    <>
      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Checkers</span>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
              Checkers
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              Manage WASSCE checker stock, track issued codes, and review buyer payments in one place.
            </p>
          </div>
          <div className="inline-flex w-fit max-w-full items-center overflow-x-auto rounded-full border border-[#DBEAFE] bg-white/90 p-1 text-[11px] shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveView("checkers")}
              className={`shrink-0 rounded-full px-3 py-1 font-medium ${activeView === "checkers"
                ? "bg-[#007AFF] text-white shadow-sm"
                : "text-[#6B7280]"
                }`}
            >
              Checkers
            </button>
            <button
              type="button"
              onClick={() => setActiveView("payments")}
              className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 font-medium ${activeView === "payments"
                ? "bg-[#007AFF] text-white shadow-sm"
                : "text-[#6B7280]"
                }`}
            >
              Payments
              {pendingPaymentCount > 0 && (
                <span className="ml-1.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[10px] font-semibold leading-none text-white">
                  {pendingPaymentCount > 99 ? "99+" : pendingPaymentCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("page")}
              className={`shrink-0 rounded-full px-3 py-1 font-medium ${
                activeView === "page"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#6B7280]"
              }`}
            >
              Page
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col items-start justify-between gap-4 rounded-3xl border border-[#DBEAFE] bg-white p-4 text-xs text-[#6B7280] shadow-sm md:flex-row md:items-center">
        <p className="max-w-2xl leading-5">
          {activeView === "page"
            ? "Edit the WASSCE checker price and the steps shown on /wassce-checker. Changes go live immediately after you save."
            : "Manage WASSCE checker inventory and see which checkers have been issued to users."}
        </p>
        {activeView !== "page" && (
        <div className="flex flex-wrap items-center gap-2">
          {activeView === "checkers" && selectedCheckerIds.length > 0 && (
            <button
              type="button"
              disabled={deleteInProgress}
              onClick={() => void handleBulkDelete()}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FECACA] bg-white px-3 py-1.5 text-[11px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedCheckerIds.length} selected
            </button>
          )}
          <button
            type="button"
            onClick={handleRefreshCheckers}
            className="inline-flex items-center justify-center rounded-full border border-[#DBEAFE] bg-white px-3 py-2 text-[11px] font-medium text-[#111827] hover:bg-[#F8FBFF]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#0062CC]"
          >
            Add checkers
          </button>
        </div>
        )}
      </section>

      {activeView === "checkers" && pendingPaymentCount > 0 && !paymentsLoading && (
        <div className="mt-4 rounded-3xl border border-amber-200/80 bg-gradient-to-r from-[#FFF7D6] to-[#FFFBEB] px-4 py-4 text-sm text-[#92400E] shadow-sm">
          <p className="font-medium">
            {pendingPaymentCount} paid order
            {pendingPaymentCount === 1 ? "" : "s"} still waiting for checker
            {pendingPaymentCount === 1 ? "" : "s"} to be issued.
          </p>
          <p className="mt-1 text-xs text-[#B45309]">
            Add unissued checkers below, or open Payments and use the Pending
            filter to see who is owed.
          </p>
          <button
            type="button"
            onClick={() => {
              setPaymentsFulfilmentFilter("pending");
              setActiveView("payments");
            }}
            className="mt-2 text-xs font-semibold text-[#B45309] underline-offset-2 hover:underline"
          >
            View pending payments
          </button>
        </div>
      )}

      {activeView === "checkers" && (
        <section className="mt-5 grid gap-4 text-sm text-[#111827] sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-5 py-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Total Checkers
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
              {checkers.length}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">Across all statuses</p>
          </div>

          <div className="rounded-3xl border border-[#DCFCE7] bg-gradient-to-br from-white to-[#F0FDF4] px-5 py-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Issued
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#166534]">
              {checkers.filter((c) => c.status === "Issued").length}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">Sent to buyers via email</p>
          </div>

          <div className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-5 py-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Revenue (estimated)
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
              GHS
              {" "}
              {(
                checkers.filter((c) => c.status === "Issued").length * 22
              ).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">Based on GHS 22 per checker</p>
          </div>

          <div className="rounded-3xl border border-[#FDE68A] bg-gradient-to-br from-white to-[#FFF7D6] px-5 py-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Pending issue
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#B45309]">
              {paymentsLoading ? "—" : pendingPaymentCount}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Paid orders not fully issued yet
            </p>
          </div>
        </section>
      )}

      {activeView === "checkers" && (
        <section className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-4 py-3 text-xs shadow-sm">
          <span className="font-medium text-[#6B7280]">Filter:</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3 py-1 ${statusFilter === "all"
              ? "bg-[#007AFF] text-white"
              : "bg-[#EFF6FF] text-[#31557D] hover:bg-[#DBEAFE]"
              }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("Issued")}
            className={`rounded-full px-3 py-1 ${statusFilter === "Issued"
              ? "bg-[#16A34A] text-white"
              : "bg-[#ECFDF3] text-[#166534] hover:bg-[#DCFCE7]"
              }`}
          >
            Issued
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("Unissued")}
            className={`rounded-full px-3 py-1 ${statusFilter === "Unissued"
              ? "bg-[#B45309] text-white"
              : "bg-[#FFF7D6] text-[#92400E] hover:bg-[#FEF3C7]"
              }`}
          >
            Unissued
          </button>
        </section>
      )}

      {activeView === "checkers" && !loading && !error && filteredCheckers.length > 0 && (
        <section className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-[#9CA3AF] text-[#2563EB] focus:ring-[#2563EB]"
              checked={allOnPageSelected}
              disabled={deleteInProgress || paginatedCheckers.length === 0}
              onChange={toggleSelectAllOnPage}
            />
            <span>Select all on this page</span>
          </label>
        </section>
      )}

      {activeView === "checkers" && (
        <section className="mt-4 grid gap-4 text-sm text-[#111827] sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-32 rounded-2xl bg-[#F3F4F6]"
              />
            ))
          ) : error ? (
            <p className="col-span-full text-xs text-[#DC2626]">{error}</p>
          ) : filteredCheckers.length === 0 ? (
            <p className="col-span-full text-xs text-[#6B7280]">
              No checkers found yet. Once you add checkers, they will appear here.
            </p>
          ) : (
            paginatedCheckers.map((checker) => (
              <article
                key={checker.id}
                className="relative flex flex-col justify-between rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-4 py-4 shadow-sm"
              >
                <div className="pointer-events-none absolute inset-y-2 left-0 flex items-center">
                  <div className="h-7 w-3 rounded-r-full bg-white" />
                </div>
                <div className="pointer-events-none absolute inset-y-2 right-0 flex items-center justify-end">
                  <div className="h-7 w-3 rounded-l-full bg-white" />
                </div>
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-[#D1D5DB] opacity-70" />

                <div className="flex items-start justify-between gap-2 pb-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-[#9CA3AF] text-[#2563EB] focus:ring-[#2563EB]"
                      checked={selectedCheckerIds.includes(checker.id)}
                      disabled={deleteInProgress}
                      onChange={() => toggleCheckerSelect(checker.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select checker ${checker.serial}`}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]">
                        Checker Serial
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-[#111827] break-all">
                        {checker.serial}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${checker.status === "Unissued"
                        ? "bg-[#FFF7D6] text-[#92400E]"
                        : "bg-[#ECFDF3] text-[#166534]"
                        }`}
                    >
                      {checker.status}
                    </span>
                    <button
                      type="button"
                      title="Delete checker"
                      disabled={deleteInProgress}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteOne(checker);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]">
                      PIN
                    </p>
                    <p className="inline-flex items-center rounded-full border border-dashed border-[#BFDBFE] bg-white px-3 py-1 font-mono text-xs tracking-[0.2em] text-[#111827]">
                      {checker.pin}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#6B7280]">
                    <p className="font-medium text-[#4B5563]">
                      {checker.issuedTo || "Not issued"}
                    </p>
                    <p className="mt-0.5 text-[11px]">
                      {checker.issuedAt || "—"}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeView === "checkers" &&
        !loading &&
        !error &&
        filteredCheckers.length > 0 && (
          <section className="mt-4 flex flex-col gap-3 text-[11px] text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0">
              Showing
              {" "}
              <span className="font-medium text-[#111827]">
                {Math.min(filteredCheckers.length, (currentPage - 1) * pageSize + 1)}
              </span>
              {" "}
              to
              {" "}
              <span className="font-medium text-[#111827]">
                {Math.min(filteredCheckers.length, currentPage * pageSize)}
              </span>
              {" "}
              of
              {" "}
              <span className="font-medium text-[#111827]">
                {filteredCheckers.length}
              </span>
              {" "}
              checkers
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="shrink-0 rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
              >
                Previous
              </button>
              <span className="text-[11px] text-[#6B7280]">
                Page
                {" "}
                <span className="font-medium text-[#111827]">{currentPage}</span>
                {" "}
                of
                {" "}
                <span className="font-medium text-[#111827]">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="shrink-0 rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
              >
                Next
              </button>
            </div>
          </section>
        )}

      {activeView === "page" && (
        <section className="mt-5 rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#111827]">
              WASSCE checker page
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Defaults match what is currently on the public page. Edit the
              price and steps, then save. Use{" "}
              <code className="rounded bg-[#F3F4F6] px-1 text-[11px]">
                {"{price}"}
              </code>{" "}
              in a step to auto-insert the live price (e.g.{" "}
              <code className="rounded bg-[#F3F4F6] px-1 text-[11px]">
                Make payment of {"{price}"}
              </code>
              ).
            </p>
          </div>

          {pageLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin text-[#007AFF]" />
              Loading settings…
            </div>
          ) : (
            <div className="space-y-5">
              <label className="block max-w-xs space-y-1.5 text-sm">
                <span className="font-medium text-[#374151]">
                  Price per checker (GHS)
                </span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={pagePrice}
                  onChange={(e) => setPagePrice(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#374151]">Page title</span>
                <textarea
                  rows={2}
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                />
                <span className="text-[11px] text-[#9CA3AF]">
                  Use a line break for a two-line heading on the public page.
                </span>
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#374151]">
                    Steps before buying
                  </span>
                  <button
                    type="button"
                    onClick={() => setPageSteps((prev) => [...prev, ""])}
                    className="inline-flex items-center gap-1 rounded-full border border-[#DBEAFE] bg-white px-3 py-1 text-[11px] font-medium text-[#007AFF] hover:bg-[#F8FBFF]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {pageSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="mt-2.5 w-5 shrink-0 text-center text-xs font-semibold text-[#9CA3AF]">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) =>
                          setPageSteps((prev) =>
                            prev.map((s, i) =>
                              i === index ? e.target.value : s,
                            ),
                          )
                        }
                        placeholder={`Step ${index + 1}`}
                        className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                      />
                      <button
                        type="button"
                        disabled={pageSteps.length <= 1}
                        onClick={() =>
                          setPageSteps((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {pageError && (
                <p className="text-sm text-[#DC2626]">{pageError}</p>
              )}
              {pageMessage && (
                <p className="text-sm text-[#059669]">{pageMessage}</p>
              )}

              <button
                type="button"
                disabled={pageSaving}
                onClick={() => void savePageSettings()}
                className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0062CC] disabled:opacity-60"
              >
                {pageSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save page settings"
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {activeView === "payments" && (
        <section className="mt-5 min-w-0 rounded-3xl border border-[#DBEAFE] bg-[#F9FBFF] p-3 text-xs text-[#111827] shadow-sm sm:p-4 md:p-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                Payments
              </h2>
              <p className="mt-0.5 text-[11px] text-[#6B7280]">
                Pending = paid in full on Paystack but fewer checkers issued
                than ordered.
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:justify-end">
              <input
                type="text"
                value={paymentsSearch}
                onChange={(event) => setPaymentsSearch(event.target.value)}
                placeholder="Search by name, email, or reference"
                className="w-full min-w-0 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-[11px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE] sm:max-w-xs"
              />
              <button
                type="button"
                onClick={handleRefreshPayments}
                className="inline-flex items-center justify-center rounded-full border border-[#DBEAFE] bg-white px-3 py-2 text-[11px] font-medium text-[#111827] hover:bg-[#F8FBFF]"
              >
                Refresh
              </button>
            </div>
          </header>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5EFFD] bg-white px-3 py-3 text-[11px]">
            <span className="font-medium text-[#6B7280]">Show:</span>
            <button
              type="button"
              onClick={() => setPaymentsFulfilmentFilter("all")}
              className={`rounded-full px-3 py-1 font-medium ${paymentsFulfilmentFilter === "all"
                ? "bg-[#111827] text-white"
                : "bg-[#EFF6FF] text-[#31557D] ring-1 ring-[#DBEAFE] hover:bg-[#DBEAFE]"
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPaymentsFulfilmentFilter("pending")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${paymentsFulfilmentFilter === "pending"
                ? "bg-[#B45309] text-white"
                : "bg-white text-[#4B5563] ring-1 ring-[#E5E7EB] hover:bg-[#F9FAFB]"
                }`}
            >
              Pending
              {pendingPaymentCount > 0 && paymentsFulfilmentFilter !== "pending" && (
                <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
                  {pendingPaymentCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPaymentsFulfilmentFilter("fulfilled")}
              className={`rounded-full px-3 py-1 font-medium ${paymentsFulfilmentFilter === "fulfilled"
                ? "bg-[#166534] text-white"
                : "bg-[#ECFDF3] text-[#166534] ring-1 ring-[#BBF7D0] hover:bg-[#DCFCE7]"
                }`}
            >
              Fulfilled
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-[11px]">
              <thead className="bg-[#EFF6FF] text-[#31557D]">
                <tr>
                  <th className="px-4 py-2 font-medium">Payer</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Issued / qty</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {paymentsLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-[11px] text-[#6B7280]"
                    >
                      Loading payments...
                    </td>
                  </tr>
                ) : paymentsError ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-[11px] text-[#DC2626]"
                    >
                      {paymentsError}
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-[11px] text-[#6B7280]"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111827]">
                            {payment.fullName || payment.email}
                          </span>
                          <span className="text-[11px] text-[#6B7280]">
                            {payment.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle font-mono text-[11px] text-[#111827]">
                        {payment.reference}
                      </td>
                      <td className="px-4 py-2 align-middle font-medium text-[#111827]">
                        {payment.quantity}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span
                          className={`font-medium ${payment.issuedCount < payment.quantity ? "text-[#D97706]" : "text-[#166534]"}`}
                          title={`${payment.issuedCount} of ${payment.quantity} checkers issued`}
                        >
                          {payment.issuedCount}
                          {" "}
                          /
                          {" "}
                          {payment.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="font-medium text-[#111827]">
                          {payment.currency} {(payment.amount / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium ${payment.status === "success"
                              ? "bg-[#ECFDF3] text-[#166534]"
                              : "bg-[#FEF2F2] text-[#B91C1C]"
                              }`}
                          >
                            {payment.status}
                          </span>
                          {payment.status === "success" && payment.issuedCount < payment.quantity && (
                            <span className="inline-flex items-center justify-center rounded-full bg-[#FFFBEB] px-2 py-1 text-[10px] font-medium text-[#B45309] ring-1 ring-inset ring-[#F59E0B]/20">
                              Pending Issue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-[11px] text-[#6B7280]">
                        {new Date(payment.paidAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!paymentsLoading && !paymentsError && filteredPayments.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 text-[11px] text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0">
                Showing
                {" "}
                <span className="font-medium text-[#111827]">
                  {Math.min(
                    filteredPayments.length,
                    (paymentsPage - 1) * paymentsPageSize + 1,
                  )}
                </span>
                {" "}
                to
                {" "}
                <span className="font-medium text-[#111827]">
                  {Math.min(
                    filteredPayments.length,
                    paymentsPage * paymentsPageSize,
                  )}
                </span>
                {" "}
                of
                {" "}
                <span className="font-medium text-[#111827]">
                  {filteredPayments.length}
                </span>
                {" "}
                payments
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentsPage((page) => Math.max(1, page - 1))
                  }
                  disabled={paymentsPage === 1}
                  className="shrink-0 rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
                >
                  Previous
                </button>
                <span>
                  Page
                  {" "}
                  <span className="font-medium text-[#111827]">
                    {paymentsPage}
                  </span>
                  {" "}
                  of
                  {" "}
                  <span className="font-medium text-[#111827]">
                    {paymentsTotalPages}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentsPage((page) =>
                      Math.min(paymentsTotalPages, page + 1),
                    )
                  }
                  disabled={paymentsPage === paymentsTotalPages}
                  className="shrink-0 rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {addOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setAddOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center md:inset-0 md:items-center md:justify-center">
            <div className="w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-[#DBEAFE] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-xl [max-height:min(90dvh,900px)] md:rounded-3xl md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 sm:gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#007AFF]">
                    Add checkers
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[#6B7280]">
                    Add a single checker manually or upload a file with multiple
                    serials and PINs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DBEAFE] text-sm text-[#111827] hover:bg-[#F8FBFF]"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid gap-4 text-xs text-[#111827] md:grid-cols-2">
                <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-4 py-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    Add checker manually
                  </h3>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Quickly register a single checker by typing the serial and PIN.
                  </p>

                  <div className="mt-3 space-y-3 text-xs">
                    <div className="space-y-1">
                      <label
                        htmlFor="checker-serial"
                        className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]"
                      >
                        Serial
                      </label>
                      <input
                        id="checker-serial"
                        type="text"
                        value={newSerial}
                        onChange={(event) => setNewSerial(event.target.value)}
                        className="w-full rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                        placeholder="e.g. TG-8F3K9PZA"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="checker-pin"
                        className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]"
                      >
                        PIN
                      </label>
                      <input
                        id="checker-pin"
                        type="text"
                        value={newPin}
                        onChange={(event) => setNewPin(event.target.value)}
                        className="w-full rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                        placeholder="Enter PIN"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="checker-status"
                        className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]"
                      >
                        Status
                      </label>
                      <select
                        id="checker-status"
                        className="w-full rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#BFDBFE]"
                        value={newStatus}
                        onChange={(event) =>
                          setNewStatus(event.target.value as CheckerStatus)
                        }
                      >
                        <option value="Unissued">Unissued</option>
                        <option value="Issued">Issued</option>
                      </select>
                    </div>

                    {saveError && (
                      <p className="text-[11px] text-[#DC2626]">{saveError}</p>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        if (!newSerial.trim() || !newPin.trim()) {
                          setSaveError("Serial and PIN are required.");
                          return;
                        }

                        try {
                          setSaving(true);
                          setSaveError(null);

                          const res = await fetch("/api/admin/checkers", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              serial: newSerial.trim(),
                              pin: newPin.trim(),
                              status: newStatus,
                            }),
                          });

                          const data = await res.json();
                          if (!res.ok) {
                            setSaveError(
                              data.error || "Could not save checker. Please try again.",
                            );
                            return;
                          }

                          if (data.checker) {
                            setCheckers((prev) => [data.checker, ...prev]);
                          }

                          setNewSerial("");
                          setNewPin("");
                          setNewStatus("Unissued");
                          setAddOpen(false);
                        } catch {
                          setSaveError("Something went wrong. Please try again.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#007AFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
                    >
                      {saving ? "Saving..." : "Save checker"}
                    </button>
                  </div>
                </article>

                <article className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] px-4 py-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    Bulk upload
                  </h3>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Upload a PDF, CSV, TSV, or Excel file with <strong>Serial</strong> in
                    the first column and <strong>PIN</strong> in the second. An optional
                    header row (Serial / PIN) is detected automatically. PDFs must contain
                    selectable text (or export from Excel/CSV and upload that file).
                  </p>

                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <label
                      htmlFor="checker-upload"
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#BFDBFE] bg-white px-4 py-6 text-center hover:border-[#007AFF] hover:bg-[#F8FBFF] ${bulkUploading ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B0]">
                        {bulkUploading
                          ? "Importing…"
                          : "Drop file here or click to browse"}
                      </span>
                      <span className="mt-1 text-xs text-[#4B5563]">
                        Accepted: .pdf, .csv, .tsv, .xls, .xlsx, .txt
                      </span>
                      <input
                        id="checker-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.csv,.tsv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/pdf"
                        disabled={bulkUploading}
                        onChange={handleBulkFileChange}
                      />
                    </label>

                    {bulkError && (
                      <p className="text-[11px] text-[#DC2626]">{bulkError}</p>
                    )}
                    {bulkResult && (
                      <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-[11px] text-[#14532D]">
                        {bulkResult.message && <p className="font-medium">{bulkResult.message}</p>}
                        <p>
                          Imported:{" "}
                          <span className="font-semibold">{bulkResult.inserted}</span> new
                          checker
                          {bulkResult.inserted === 1 ? "" : "s"} (parsed{" "}
                          {bulkResult.totalParsed} unique row
                          {bulkResult.totalParsed === 1 ? "" : "s"} in file
                          {bulkResult.droppedDuplicateInFile > 0
                            ? `, ${bulkResult.droppedDuplicateInFile} duplicate serial in file skipped`
                            : ""}
                          {bulkResult.skippedAlreadyInDatabase > 0
                            ? `, ${bulkResult.skippedAlreadyInDatabase} already in database`
                            : ""}
                          )
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
