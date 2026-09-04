"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import {
  buildCheckerLastPurchaseFromVerify,
  type LastCheckerStored,
} from "@/lib/last-purchase-badges";

function WassceCheckerSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>(
    "Verifying your payment and sending your checker...",
  );

  useEffect(() => {
    const rawRef = searchParams.get("reference");
    const ref = rawRef ?? "";
    if (!ref) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }

    const handledKey = ref ? `tg_wassce_success_handled:${ref}` : null;

    let alreadyHandled = false;
    if (typeof window !== "undefined" && handledKey) {
      alreadyHandled = Boolean(window.sessionStorage.getItem(handledKey));
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/payments/wassce/verify?reference=${encodeURIComponent(ref)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(
            data.error ||
            "Payment failed or could not be verified. Your checker was not sent. Please contact support or try again.",
          );
          return;
        }

        const checkers: { serial: string; pin: string }[] = Array.isArray(
          data.checkers,
        )
          ? data.checkers
          : data.serial && data.pin
            ? [{ serial: data.serial as string, pin: data.pin as string }]
            : [];

        const quantity: number =
          typeof data.quantity === "number" && data.quantity > 0
            ? data.quantity
              : 1;

        if (typeof window !== "undefined") {
          try {
            let previousChecker: LastCheckerStored | null = null;
            try {
              const prevRaw = window.localStorage.getItem(
                "tg_last_checker_purchase",
              );
              if (prevRaw) {
                previousChecker = JSON.parse(prevRaw) as LastCheckerStored;
              }
            } catch {
              previousChecker = null;
            }
            const apiEmail = typeof data.email === "string" ? data.email : null;
            const storedEmail = window.localStorage.getItem("tg_user_email");
            const emailForPurchase = (
              storedEmail ||
              apiEmail ||
              ""
            ).trim();
            const checkerPayload = buildCheckerLastPurchaseFromVerify({
              email: emailForPurchase,
              reference: (data.reference as string) || ref,
              pending: Boolean(data.pending),
              previous: previousChecker,
            });
            window.localStorage.setItem(
              "tg_last_checker_purchase",
              JSON.stringify(checkerPayload),
            );
            window.dispatchEvent(new Event("tg-checker-purchased"));
          } catch {
            // ignore badge sync errors
          }
        }

        if (typeof window !== "undefined" && !alreadyHandled) {
          try {
            const apiEmail = typeof data.email === "string" ? data.email : null;
            const storedEmail = window.localStorage.getItem("tg_user_email");
            const emailKey = (storedEmail || apiEmail || "").toLowerCase();

            if (emailKey) {
              const storageKey = `tg_notifications:${emailKey}`;
              const raw = window.localStorage.getItem(storageKey);
              const existing = raw ? JSON.parse(raw) : [];

              const firstChecker = checkers[0];

              const isPending = Boolean(data.pending);

              const bodyBase = isPending
                ? "Your order has been queued. Your Wassce Checker will be emailed shortly."
                : quantity > 1
                  ? `You bought ${quantity} WASSCE checkers. Check your email for all serials and PINs.`
                  : firstChecker
                    ? `Your checker ${firstChecker.serial} with PIN ${firstChecker.pin} has been sent to your email.`
                    : "Your WASSCE checker has been sent to your email.";

              const next = [
                {
                  id: `${Date.now()}`,
                  title: isPending
                    ? "WASSCE Order Queued"
                    : quantity > 1
                      ? `WASSCE checkers purchased (${quantity})`
                      : "WASSCE checker purchased",
                  body: bodyBase,
                  read: false,
                  createdAt: new Date().toISOString(),
                  href: "/dashboard/my-checkers",
                  kind: "checker",
                },
                ...(Array.isArray(existing) ? existing : []),
              ];

              window.localStorage.setItem(storageKey, JSON.stringify(next));
              window.dispatchEvent(
                new CustomEvent("tg-notifications-updated"),
              );
            }

            const adminRaw = window.localStorage.getItem("tg_admin_notifications");
            const adminExisting = adminRaw ? JSON.parse(adminRaw) : [];
            const adminNext = [
              {
                id: `${Date.now()}`,
                title:
                  quantity > 1
                    ? `New WASSCE checker purchase (${quantity})`
                    : "New WASSCE checker purchase",
                body:
                  data.email && data.reference
                    ? quantity > 1
                      ? `${data.email} bought ${quantity} WASSCE checkers (ref: ${data.reference}).`
                      : `${data.email} bought a WASSCE checker (ref: ${data.reference}).`
                    : quantity > 1
                      ? "Multiple WASSCE checkers have just been purchased."
                      : "A WASSCE checker has just been purchased.",
                read: false,
                createdAt: new Date().toISOString(),
                section: "checkers",
              },
              ...(Array.isArray(adminExisting) ? adminExisting : []),
            ];

            window.localStorage.setItem(
              "tg_admin_notifications",
              JSON.stringify(adminNext),
            );
            window.dispatchEvent(
              new CustomEvent("tg-admin-notifications-updated"),
            );
          } catch {
            // ignore notification errors
          }
        }

        setStatus("ok");
        if (data.pending) {
          setMessage("Payment verified! Your order has been queued. You will receive your checker via email shortly.");
        } else {
          setMessage(
            quantity > 1
              ? `Payment verified! ${quantity} WASSCE checker serials & PINs have been sent to your email.`
              : "Payment verified! A WASSCE checker serial & PIN have been sent to your email.",
          );
        }

        if (typeof window !== "undefined" && handledKey) {
          window.sessionStorage.setItem(handledKey, "1");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong while verifying your payment.");
      }
    }

    verify();

    const handleUpdate = () => {
      // Re-verify to get new status and message
      verify();
    };

    window.addEventListener("tg-purchases-updated", handleUpdate);
    return () => window.removeEventListener("tg-purchases-updated", handleUpdate);
  }, [searchParams]);

  return (
    <main className="flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        WASSCE Checker Purchase
      </h1>
      <p
        className={`text-sm md:text-base ${status === "error" ? "text-[#DC2626]" : "text-[#374151]"
          }`}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => router.push("/wassce-checker")}
        className="mt-4 rounded-xl border border-[#E0E0E0] px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F3F4F6]"
      >
        Back to WASSCE checker page
      </button>
    </main>
  );
}

export default function WassceCheckerSuccessPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-8 sm:px-6 md:gap-5 md:px-10 md:pb-10">
        <Header />

        <Suspense fallback={null}>
          <WassceCheckerSuccessContent />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
