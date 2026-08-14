"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, MousePointerClick } from "lucide-react";

type AssistanceMedium = "call" | "sms" | "whatsapp" | "email";

type CheckerPurchase = {
  id: string;
  type: "wassce_checker";
  name: string;
  date: string;
  vouchers: { serial: string; pin: string }[];
  quantity?: number;
  status: "issued" | "pending";
};

export default function MyCheckersDashboardPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<CheckerPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const [showAssistance, setShowAssistance] = useState(false);
  const [step, setStep] = useState<"medium" | "contact">("medium");
  const [medium, setMedium] = useState<AssistanceMedium | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function fetchPurchases() {
    try {
      const email = window.localStorage.getItem("tg_user_email");
      if (!email) {
        setError("User email not found. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/user/purchases?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (res.ok) {
        const list = (data.purchases || []) as CheckerPurchase[];
        setPurchases(
          list.filter((p) => p.type === "wassce_checker"),
        );
      } else {
        setError(data.error || "Failed to fetch purchases.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = window.localStorage.getItem("tg_user_email");
    if (!email) {
      router.replace(
        `/signin?redirect=${encodeURIComponent("/dashboard/my-checkers")}`,
      );
      return;
    }

    void fetchPurchases();

    const handleUpdate = () => {
      void fetchPurchases();
    };

    window.addEventListener("tg-purchases-updated", handleUpdate);
    return () => window.removeEventListener("tg-purchases-updated", handleUpdate);
  }, [router]);

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-sm font-medium text-[#555555]">Loading your checkers…</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .flip-card {
          background-color: transparent;
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          cursor: pointer;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          inset: 0;
          width: 100%;
          min-height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 32px;
        }
        .flip-card-back {
          transform: rotateY(180deg);
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.0) 30%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.0) 70%,
            transparent 100%
          );
          transform: skewX(-20deg);
          animation: shimmer 3s infinite linear;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(50%) skewX(-20deg); }
        }
      `}</style>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold leading-tight text-[#1E1E1E]">My checkers</h1>
          <p className="text-sm text-[#555555]">
            WASSCE result checkers you have purchased
          </p>
        </div>

        <div className="relative">
          {!showAssistance ? (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#007AFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#007AFF]/10 transition-all hover:bg-[#0062CC] hover:shadow-xl active:scale-95"
              onClick={() => {
                setShowAssistance(true);
                setStep("medium");
                setIsSubmitted(false);
                setMedium(null);
                setContactValue("");
                setSubmitError(null);
              }}
            >
              Get assistance
            </button>
          ) : (
            <div className="w-full space-y-4 rounded-[32px] border border-[#E0E0E0] bg-white p-6 shadow-xl transition-all sm:absolute sm:right-0 sm:top-0 sm:z-20 sm:w-[320px]">
              {isSubmitted ? (
                <div className="space-y-2 py-2">
                  <p className="text-base font-bold text-[#1E1E1E]">
                    Request received
                  </p>
                  <p className="text-xs text-[#555555]">
                    Our team will reach out to you at{" "}
                    <span className="font-semibold text-[#007AFF]">{contactValue}</span>{" "}
                    shortly.
                  </p>
                </div>
              ) : (
                <>
                  {step === "medium" && (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-[#1E1E1E]">
                        How should we reach you?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["call", "sms", "whatsapp", "email"] as AssistanceMedium[]).map(
                          (option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setMedium(option)}
                              className={`rounded-2xl border px-3 py-2.5 text-[11px] font-semibold capitalize transition ${medium === option
                                ? "border-[#007AFF] bg-[#007AFF] text-white"
                                : "border-[#F0F0F0] bg-[#F9F9F9] text-[#555555] hover:border-[#007AFF]/30"
                                }`}
                            >
                              {option}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!medium}
                        onClick={() => setStep("contact")}
                        className="w-full rounded-2xl bg-[#1E1E1E] py-3 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {step === "contact" && medium && (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-[#1E1E1E]">
                        {medium === "email" ? "Your email address" : "Your phone number"}
                      </p>
                      <input
                        type={medium === "email" ? "email" : "tel"}
                        value={contactValue}
                        onChange={(event) => setContactValue(event.target.value)}
                        placeholder={medium === "email" ? "you@example.com" : "024 000 0000"}
                        className="w-full rounded-2xl border border-[#F0F0F0] bg-[#F9F9F9] px-4 py-3 text-sm text-[#1E1E1E] outline-none transition focus:border-[#007AFF]"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!contactValue || isSubmitting}
                          onClick={async () => {
                            if (!medium || !contactValue || isSubmitting) return;
                            try {
                              setIsSubmitting(true);
                              setSubmitError(null);
                              const userEmail =
                                typeof window !== "undefined"
                                  ? window.localStorage.getItem("tg_user_email")
                                  : null;
                              const res = await fetch("/api/assistance", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  medium,
                                  contact: contactValue,
                                  ...(userEmail
                                    ? { requesterEmail: userEmail }
                                    : {}),
                                }),
                              });
                              if (!res.ok) throw new Error();
                              setIsSubmitted(true);
                            } catch {
                              setSubmitError("Failed to submit. Please try again.");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          className="w-full rounded-2xl bg-[#007AFF] py-3 text-xs font-bold text-white transition hover:bg-[#0062CC] disabled:bg-[#9EC8FF]"
                        >
                          {isSubmitting ? "Sending…" : "Submit"}
                        </button>
                      </div>
                      {submitError && (
                        <p className="text-center text-[10px] font-medium text-[#DC2626]">{submitError}</p>
                      )}
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => setShowAssistance(false)}
                className="mt-2 w-full text-[10px] font-bold uppercase tracking-widest text-[#9E9E9E] hover:text-[#1E1E1E]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-3xl bg-[#FEF2F2] p-8 text-center">
          <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-[40px] bg-[#F9F9F9] py-20 text-center">
          <h2 className="mb-2 text-xl font-bold text-[#1E1E1E]">No checkers yet</h2>
          <p className="mb-8 max-w-xs text-sm text-[#555555]">
            You haven&apos;t purchased any WASSCE result checkers yet.
          </p>
          <button
            onClick={() => { window.open("/wassce-checker", "_self"); }}
            className="rounded-full bg-[#007AFF] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#0062CC]"
          >
            Buy a checker
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:max-w-4xl">
          {purchases.map((purchase) => {
            const qty = purchase.quantity ?? purchase.vouchers?.length ?? 0;
            const voucherCount = purchase.vouchers?.length ?? 0;
            const hasCheckers = voucherCount > 0;
            const isPartial =
              qty > 0 && hasCheckers && voucherCount < qty;
            const isFlipped = flippedIds.has(purchase.id);
            const cardMinHeight = isFlipped
              ? Math.min(560, 148 + Math.max(voucherCount, 1) * 132)
              : 220;

            let statusLabel = "Pending";
            if (hasCheckers) {
              statusLabel = isPartial ? "Partial" : "Active";
            }

            return (
              <div
                key={purchase.id}
                className={`flip-card ${isFlipped ? "flipped" : ""}`}
                style={{ minHeight: cardMinHeight }}
                onClick={() => toggleFlip(purchase.id)}
              >
                <div
                  className="flip-card-inner"
                  style={{ minHeight: cardMinHeight }}
                >
                  <article className="flip-card-front flex flex-col justify-between bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] px-8 py-8 shadow-sm transition-shadow hover:shadow-md">
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-lg font-bold text-[#2E7D32]">
                          WA
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isPartial
                              ? "bg-amber-100/90 text-amber-800"
                              : "bg-white/60 text-[#2E7D32]"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold leading-tight text-[#1E1E1E]">
                        {purchase.name}
                      </h2>
                      <p className="mt-2 text-xs font-medium text-[#555555]">
                        {qty > 0 ? `Quantity: ${qty}` : "WASSCE result checker"}{" "}
                        &middot;{" "}
                        {new Date(purchase.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#2E7D32]">
                      <MousePointerClick className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">Click to view details</span>
                    </div>
                  </article>

                  <article
                    className="flip-card-back flex flex-col bg-[#0d1117] px-6 py-6 text-white shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="shimmer" />
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Serial &amp; PIN
                      </p>
                      {isPartial && (
                        <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-100">
                          {voucherCount} of {qty} checkers issued. Remaining
                          serials will appear here when stock is available.
                        </p>
                      )}
                      {hasCheckers ? (
                        <ul className="mt-3 space-y-3">
                          {purchase.vouchers.map((v, i) => (
                            <li
                              key={`${v.serial}-${i}`}
                              className="rounded-2xl border border-white/10 bg-white/5 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase text-white/40">Serial</span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    copyToClipboard(
                                      e,
                                      v.serial,
                                      `${purchase.id}-${i}-serial`,
                                    )
                                  }
                                  className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/80 transition hover:bg-white/10"
                                >
                                  Copy
                                  <Copy
                                    className={`h-2.5 w-2.5 ${copyingId === `${purchase.id}-${i}-serial` ? "text-[#4ADE80]" : ""}`}
                                  />
                                </button>
                              </div>
                              <p className="font-mono text-sm font-bold tracking-tight text-white break-all">
                                {v.serial}
                              </p>
                              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                                <span className="text-[9px] font-bold uppercase text-white/40">PIN</span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    copyToClipboard(
                                      e,
                                      v.pin,
                                      `${purchase.id}-${i}-pin`,
                                    )
                                  }
                                  className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/80 transition hover:bg-white/10"
                                >
                                  Copy
                                  <Copy
                                    className={`h-2.5 w-2.5 ${copyingId === `${purchase.id}-${i}-pin` ? "text-[#4ADE80]" : ""}`}
                                  />
                                </button>
                              </div>
                              <p className="mt-0.5 font-mono text-sm font-bold tracking-widest text-white">
                                {v.pin}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
                          <Loader2 className="mb-2 h-6 w-6 animate-spin text-white/40" />
                          <p className="text-sm font-medium text-white/60">
                            Issuing checkers…
                          </p>
                          {qty > 1 && (
                            <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-white/40">
                              We are preparing {qty} checkers. Check back shortly
                              or refresh this page.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlip(purchase.id);
                      }}
                      className="relative z-10 mt-4 shrink-0 text-center text-[10px] font-medium text-white/40 italic transition hover:text-white/70"
                    >
                      Tap to flip back
                    </button>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
