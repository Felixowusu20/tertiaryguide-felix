"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import {
  buildVoucherLastPurchasePayload,
  type LastVoucherStored,
} from "@/lib/last-purchase-badges";

function UniversityFormSuccessContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const reference = searchParams.get("reference") ?? "";
  const schoolId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{ serial: string; pin: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/payments/forms/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not verify payment.");
        }
        if (!cancelled) {
          setEmail(data.email ?? null);
          setVoucher(data.voucher ?? null);
          setPending(Boolean(data.pending));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not verify payment. Please contact support.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    const handleUpdate = () => {
      void load();
    };

    window.addEventListener("tg-purchases-updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("tg-purchases-updated", handleUpdate);
    };
  }, [reference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!email) return;

    try {
      let previous: LastVoucherStored | null = null;
      try {
        const prevRaw = window.localStorage.getItem("tg_last_voucher_purchase");
        if (prevRaw) {
          previous = JSON.parse(prevRaw) as LastVoucherStored;
        }
      } catch {
        previous = null;
      }

      const payload = buildVoucherLastPurchasePayload({
        email,
        schoolId: typeof schoolId === "string" ? schoolId : null,
        reference,
        voucher,
        pending,
        previous,
      });

      window.localStorage.setItem(
        "tg_last_voucher_purchase",
        JSON.stringify(payload),
      );
      window.dispatchEvent(new CustomEvent("tg-voucher-purchased"));
    } catch {
      // ignore
    }
  }, [email, voucher, pending, reference, schoolId]);

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-8 sm:px-6 md:gap-5 md:px-10 md:pb-10">
        <Header />

        <main className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Voucher purchase
          </h1>

          {error ? (
            <p className="text-sm text-[#DC2626]">{error}</p>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin text-[#007AFF]" />
              Verifying your payment and opening My Forms…
            </p>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default function UniversityFormSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    }>
      <UniversityFormSuccessContent />
    </Suspense>
  );
}
