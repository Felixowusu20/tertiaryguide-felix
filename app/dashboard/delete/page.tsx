"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleDelete = async () => {
    if (submitting) return;

    setError(null);

    const email =
      typeof window !== "undefined"
        ? window.localStorage.getItem("tg_user_email")
        : null;

    if (!email) {
      setError("Could not determine current user.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete account.");
        return;
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("tg_user_email");
        }
      } catch {
        // ignore storage errors
      }

      setToast("Account deleted successfully.");

      setTimeout(() => {
        setToast(null);
        router.push("/");
      }, 900);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1E1E1E] px-4 py-3 text-sm text-white shadow-lg shadow-black/20">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E33F3F] text-xs font-semibold">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center gap-8 text-center md:items-start md:text-left">
        {/* Image */}
        <div className="relative mx-auto h-36 w-36 md:h-48 md:w-48 md:mx-0">
          <Image
            src="/delete.png"
            alt="Person Leaving"
            fill
            className="object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">We&apos;ll miss you</h1>

        {/* Description */}
        <p className="max-w-md text-center text-gray-600 md:text-left">
          Are you sure you want to delete your account? This action cannot be undone.
          Take a moment to reconsider.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col items-center gap-4 md:flex-row">
          <button
            type="button"
            className="rounded-full border border-[#1E1E1E] bg-white px-8 py-2.5 text-sm font-medium text-[#1E1E1E] transition hover:bg-[#F5F5F5]"
            onClick={() => router.push("/dashboard/personal-info")}
          >
            Nevermind
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full bg-[#E33F3F] px-8 py-2.5 text-sm font-medium text-white transition hover:bg-[#C42C2C] disabled:cursor-not-allowed disabled:bg-[#F29A9A]"
            disabled={submitting}
          >
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-[#E33F3F]">{error}</p>
        )}
      </div>
    </>
  );
}
