"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";

/**
 * Legacy Paystack callback for older transactions.
 * Verifies payment then sends the buyer to My Forms.
 */
function UniversityFormSuccessContent() {
  const searchParams = useSearchParams();
  const reference =
    searchParams.get("reference")?.trim() ||
    searchParams.get("trxref")?.trim() ||
    "";

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference.");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/payments/forms/verify?reference=${encodeURIComponent(reference)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not verify payment.");
        }
        if (cancelled) return;

        if (typeof data.email === "string" && data.email.trim()) {
          try {
            window.localStorage.setItem(
              "tg_user_email",
              data.email.trim().toLowerCase(),
            );
          } catch {
            // ignore
          }
        }
        window.dispatchEvent(new CustomEvent("tg-purchases-updated"));
        window.location.replace(
          `/dashboard/my-forms?reference=${encodeURIComponent(reference)}`,
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not verify payment. Please contact support.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-8 sm:px-6 md:gap-5 md:px-10 md:pb-10">
        <Header />

        <main className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Voucher purchase
          </h1>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Verifying your payment...</p>
          ) : error ? (
            <p className="text-sm text-[#DC2626]">{error}</p>
          ) : (
            <>
              <div className="space-y-3 rounded-2xl bg-[#F9FAFB] p-5 text-sm text-[#111827]">
                {pending && !voucher ? (
                  <>
                    <p className="font-medium">Your payment has been received.</p>
                    <p className="text-xs text-[#6B7280]">
                      Your voucher
                      will be emailed to you shortly.
                    </p>
                    {email && (
                      <p className="text-xs text-[#6B7280]">
                        We will send it to
                        {" "}
                        <span className="font-medium">{email}</span>
                        .
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium">Your voucher has been issued.</p>
                    {email && (
                      <p className="text-xs text-[#6B7280]">
                        A copy has been sent to
                        {" "}
                        <span className="font-medium">{email}</span>
                        .
                      </p>
                    )}
                    {voucher && (
                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                          Voucher details (keep this safe)
                        </p>
                        <div className="inline-flex flex-col gap-1 rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-4 py-3 font-mono text-xs text-[#111827]">
                          <span>Serial: {voucher.serial}</span>
                          <span>PIN: {voucher.pin}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {reference && (
                <section
                  className="mt-4 space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 text-xs text-[#111827] shadow-sm print:border print:shadow-none"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Payment receipt
                      </p>
                      <p className="text-sm font-medium">
                        University form voucher
                        {" "}
                        {pending && !voucher ? "(queued)" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.print();
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#111827] px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-black hover:shadow-md print:hidden"
                    >
                      Download receipt
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Purchaser
                      </p>
                      <p className="text-xs">
                        {email ? (
                          <span className="font-medium">{email}</span>
                        ) : (
                          <span>Not provided</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Reference
                      </p>
                      <p className="font-mono text-[11px] break-all text-[#374151]">
                        {reference || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Voucher
                      </p>
                      {voucher ? (
                        <p className="font-mono text-[11px] text-[#374151]">
                          Serial: {voucher.serial}
                          <br />
                          PIN: {voucher.pin}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#374151]">
                          Voucher will be emailed to you shortly after it is issued.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Issued at
                      </p>
                      <p className="text-[11px] text-[#374151]">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-[10px] leading-snug text-[#9CA3AF]">
                    Please keep this receipt and your voucher details safe. You may be
                    asked to provide them when completing your university application.
                  </p>
                </section>
              )}
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function UniversityFormSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        </div>
      }
    >
      <UniversityFormSuccessContent />
    </Suspense>
  );
}
