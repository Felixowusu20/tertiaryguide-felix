"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Header } from "../components/Header";
import { FaqSection } from "../components/FaqSection";
import { Footer } from "../components/Footer";

const FALLBACK_PRICE = 25;
const FALLBACK_TITLE = "Steps to get a\nWASSCE voucher";
const FALLBACK_STEPS = [
  "Enter your name and email",
  "Make payment of GHS 25.00",
  "Your PIN will be sent instantly",
];

export default function WassceCheckerPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const [priceGhs, setPriceGhs] = useState(FALLBACK_PRICE);
  const [title, setTitle] = useState(FALLBACK_TITLE);
  const [steps, setSteps] = useState<string[]>(FALLBACK_STEPS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/wassce/settings", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data.settings) {
          if (typeof data.settings.priceGhs === "number") {
            setPriceGhs(data.settings.priceGhs);
          }
          if (typeof data.settings.title === "string" && data.settings.title) {
            setTitle(data.settings.title);
          }
          if (
            Array.isArray(data.settings.steps) &&
            data.settings.steps.length > 0
          ) {
            setSteps(data.settings.steps);
          }
        }
      } catch {
        // keep fallbacks
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = quantity * priceGhs;

  const decrease = () => setQuantity((p) => (p > 1 ? p - 1 : 1));
  const increase = () => setQuantity((p) => p + 1);

  const handleBuy = () => {
    if (!fullName.trim() || !email.trim()) {
      setError("Please enter your full name and email.");
      return;
    }

    setError(null);
    setShowSummary(true);
  };

  const confirmPayment = async () => {
    try {
      setSubmitting(true);

      const res = await fetch("/api/payments/wassce/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed.");
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
      setShowSummary(false);
    }
  };

  const titleLines = title.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-4 md:px-10 md:py-8">
        <Header />

        <main className="mt-10 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <section className="max-w-xl space-y-6">
            <h1 className="text-3xl font-semibold md:text-4xl">
              {titleLines.length > 1 ? (
                <>
                  {titleLines.map((line, i) => (
                    <React.Fragment key={`${line}-${i}`}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                title
              )}
            </h1>

            {settingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin text-[#007AFF]" />
                Loading…
              </div>
            ) : (
              <ol className="list-decimal space-y-3 pl-5 text-base md:text-lg">
                {steps.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            )}
          </section>

          <section className="w-full max-w-md space-y-6">
            <div className="space-y-4">
              <input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#E0E0E0] px-4 py-3 text-sm outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              />

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E0E0E0] px-4 py-3 text-sm outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              />

              <div className="inline-flex w-32 items-center justify-between gap-3 rounded-xl border border-[#E0E0E0] px-3 py-2 text-sm">
                <button type="button" onClick={decrease}>
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={increase}>
                  +
                </button>
              </div>

              <p className="text-sm text-[#6B7280]">
                GHS {priceGhs.toFixed(2)} per checker
              </p>
            </div>

            {error && <p className="text-xs text-[#DC2626]">{error}</p>}

            <button
              type="button"
              onClick={handleBuy}
              className="flex items-center gap-2 rounded-xl bg-[#007AFF] px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-[#0062CC]"
            >
              Buy Checker
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </main>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <h2 className="text-center text-lg font-bold text-[#1E1E1E]">
                Order Summary
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Recipient
                    </span>
                    <span className="text-sm font-medium text-[#1E1E1E]">
                      {fullName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Email Address
                    </span>
                    <span className="text-sm font-medium text-[#1E1E1E]">
                      {email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Item
                    </span>
                    <span className="text-sm font-medium text-[#1E1E1E]">
                      WASSCE Voucher × {quantity}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-[#1E1E1E]">
                      Total Amount
                    </span>
                    <span className="text-xl font-extrabold text-[#007AFF]">
                      GH₵ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void confirmPayment()}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#0062CC] active:scale-[0.98] disabled:opacity-70"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Confirm & Pay
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  disabled={submitting}
                  className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Go back and edit
                </button>
              </div>
            </div>

            <div className="bg-gray-50 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                Secure Payment via Paystack
              </p>
            </div>
          </div>
        </div>
      )}

      <FaqSection />
      <Footer />
    </div>
  );
}
