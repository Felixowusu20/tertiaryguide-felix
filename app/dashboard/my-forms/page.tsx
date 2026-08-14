"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Copy, MousePointerClick } from "lucide-react";
import { AssistanceRequestForm } from "@/app/components/AssistanceRequestForm";
import { writeApplySession } from "@/lib/admissions/applicant-session";

interface Purchase {
  id: string;
  type: "university_form" | "partner_voucher";
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  schoolSlug?: string | null;
  name?: string;
  date: string;
  voucher?: { serial: string; pin: string } | null;
  programmeLevel?: "undergraduate" | "postgraduate";
  status: "issued" | "pending" | "used";
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
  } | null;
}

const APPLICANT_SESSION_KEY = "tg_applicant_session";

export default function MyFormsDashboardPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [showAssistance, setShowAssistance] = useState(false);
  const [assistanceSession, setAssistanceSession] = useState(0);

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
        const filtered = (data.purchases || []).filter(
          (p: Purchase) =>
            p.type === "university_form" || p.type === "partner_voucher",
        );
        setPurchases(filtered);
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
        `/signin?redirect=${encodeURIComponent("/dashboard/my-forms")}`,
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
    navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const openPartnerApplication = async (
    e: React.MouseEvent,
    purchase: Purchase,
  ) => {
    e.stopPropagation();
    if (!purchase.schoolId || !purchase.voucher) return;

    setOpeningId(purchase.id);
    try {
      const res = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: purchase.schoolId,
          voucherCode: purchase.voucher.pin,
          serialNumber: purchase.voucher.serial,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open application");

      writeApplySession({
        schoolId: data.school.id,
        schoolSlug: data.school.slug,
        voucherCode: data.voucher.voucherCode,
        serialNumber: data.voucher.serialNumber,
        email: window.localStorage.getItem("tg_user_email") || undefined,
      });

      window.localStorage.setItem(
        APPLICANT_SESSION_KEY,
        JSON.stringify({
          schoolId: data.school.id,
          schoolName: data.school.name,
          schoolSlug: data.school.slug,
          brandColor: data.school.brandColor ?? null,
          voucherCode: data.voucher.voucherCode,
          serialNumber: data.voucher.serialNumber,
          application: data.application,
          canEdit: data.canEdit !== false,
        }),
      );

      router.push("/apply/portal");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open your application. Please try again.",
      );
    } finally {
      setOpeningId(null);
    }
  };

  function statusLabel(purchase: Purchase) {
    if (purchase.status === "pending") return "Pending";
    if (purchase.status === "used") return "Submitted";
    if (purchase.type === "partner_voucher" && purchase.application) {
      return "In progress";
    }
    return "Active";
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-sm font-medium text-[#555555]">Loading your forms...</p>
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
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 32px;
        }
        .flip-card-back {
          transform: rotateY(180deg);
          overflow: hidden;
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
            rgba(255, 255, 255, 0.15) 50%,
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
          <h1 className="text-3xl font-semibold leading-tight text-[#1E1E1E]">My Forms</h1>
          <p className="text-sm text-[#555555]">
            University forms and direct-application vouchers linked to your account
          </p>
        </div>

        <div className="relative">
          {!showAssistance ? (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#007AFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#007AFF]/10 transition-all hover:bg-[#0062CC] hover:shadow-xl active:scale-95"
              onClick={() => {
                setAssistanceSession((s) => s + 1);
                setShowAssistance(true);
              }}
            >
              Get assistance
            </button>
          ) : (
            <AssistanceRequestForm
              key={assistanceSession}
              variant="drawer"
              onClose={() => setShowAssistance(false)}
            />
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-3xl bg-[#FEF2F2] p-8 text-center">
          <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-[40px] bg-[#F9F9F9] py-20 text-center">
          <h2 className="mb-2 text-xl font-bold text-[#1E1E1E]">No forms yet</h2>
          <p className="mb-8 max-w-sm text-sm text-[#555555]">
            Purchase a university form or a direct-application voucher to see your
            serial number and PIN here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/university-forms"
              className="rounded-full bg-[#007AFF] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#0062CC]"
            >
              Browse Forms
            </Link>
            <Link
              href="/apply"
              className="rounded-full border border-[#007AFF] px-8 py-3 text-sm font-medium text-[#007AFF] transition hover:bg-[#EFF6FF]"
            >
              Direct Applications
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:max-w-3xl">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className={`flip-card min-h-[240px] ${flippedIds.has(purchase.id) ? "flipped" : ""}`}
              onClick={() => toggleFlip(purchase.id)}
            >
              <div className="flip-card-inner h-full">
                <article
                  className={`flip-card-front flex flex-col justify-between px-8 py-8 shadow-sm transition-shadow hover:shadow-md ${
                    purchase.type === "partner_voucher"
                      ? "bg-[#EEFBF5]"
                      : "bg-[#E6F2FF]"
                  }`}
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      {purchase.schoolLogo ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white p-1 shadow-sm">
                          <Image
                            src={purchase.schoolLogo}
                            alt={purchase.schoolName || "School Logo"}
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-white/50" />
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            purchase.type === "partner_voucher"
                              ? "bg-white/70 text-[#0F766E]"
                              : "bg-white/60 text-[#007AFF]"
                          }`}
                        >
                          {purchase.type === "partner_voucher"
                            ? "Direct apply"
                            : "University form"}
                        </span>
                        <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#555555]">
                          {statusLabel(purchase)}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold leading-tight text-[#1E1E1E]">
                      {purchase.schoolName}
                    </h2>
                    {purchase.programmeLevel && (
                      <p className="mt-1 text-xs font-medium text-[#6B7280]">
                        {purchase.programmeLevel === "postgraduate"
                          ? "Postgraduate"
                          : "Undergraduate"}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-[#555555]">
                      Purchased on{" "}
                      {new Date(purchase.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {purchase.application?.applicationNumber && (
                      <p className="mt-1 text-xs text-[#0F766E]">
                        App No. {purchase.application.applicationNumber}
                      </p>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      purchase.type === "partner_voucher"
                        ? "text-[#0F766E]"
                        : "text-[#007AFF]"
                    }`}
                  >
                    <MousePointerClick className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Click to view serial & PIN
                    </span>
                  </div>
                </article>

                <article className="flip-card-back flex flex-col justify-between bg-[#080808] px-6 py-6 text-white shadow-xl">
                  <div className="shimmer" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Voucher Details
                      </p>
                      {purchase.schoolLogo && (
                        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white/10 p-1">
                          <Image
                            src={purchase.schoolLogo}
                            alt="Logo"
                            fill
                            className="object-contain p-0.5"
                          />
                        </div>
                      )}
                    </div>

                    {purchase.voucher ? (
                      <div className="space-y-3">
                        <div className="group/item">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase text-white/40">
                              Serial
                            </p>
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(
                                  e,
                                  purchase.voucher!.serial,
                                  `${purchase.id}-serial`,
                                )
                              }
                              className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 transition-colors hover:bg-white/10 hover:text-[#007AFF]"
                            >
                              <span className="text-[10px] font-bold">Copy</span>
                              <Copy
                                className={`h-3 w-3 ${
                                  copyingId === `${purchase.id}-serial`
                                    ? "text-[#16A34A]"
                                    : ""
                                }`}
                              />
                            </button>
                          </div>
                          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
                            {purchase.voucher.serial}
                          </p>
                        </div>

                        <div className="group/item border-t border-white/10 pt-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase text-white/40">
                              PIN
                            </p>
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(
                                  e,
                                  purchase.voucher!.pin,
                                  `${purchase.id}-pin`,
                                )
                              }
                              className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 transition-colors hover:bg-white/10 hover:text-[#007AFF]"
                            >
                              <span className="text-[10px] font-bold">Copy</span>
                              <Copy
                                className={`h-3 w-3 ${
                                  copyingId === `${purchase.id}-pin`
                                    ? "text-[#16A34A]"
                                    : ""
                                }`}
                              />
                            </button>
                          </div>
                          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
                            {purchase.voucher.pin}
                          </p>
                        </div>

                        {purchase.type === "partner_voucher" && (
                          <button
                            type="button"
                            onClick={(e) => void openPartnerApplication(e, purchase)}
                            disabled={openingId === purchase.id}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0062CC] disabled:opacity-60"
                          >
                            {openingId === purchase.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                            Open application portal
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 py-2 text-left">
                        <p className="text-sm font-medium leading-relaxed text-white/90">
                          Your voucher code will be sent to you shortly. Use{" "}
                          <span className="font-semibold text-white">Get assistance</span>{" "}
                          above if you need help.
                        </p>
                        <p className="text-xs text-white/50">
                          School: {purchase.schoolName ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 text-center">
                    <p className="text-[10px] font-medium italic text-white/30">
                      Click card to flip back
                    </p>
                  </div>
                </article>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
