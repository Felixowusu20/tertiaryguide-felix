"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/app/components/PasswordInput";

export default function AdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState("superadmin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch("/api/admin/setup/status");
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Could not check setup status.");
          return;
        }

        if (!data.needsSetup) {
          router.replace("/admin/signin");
          return;
        }

        setNeedsSetup(true);
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Please try again.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create superadmin.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("tg_admin_username", data.admin.username);
        window.localStorage.setItem("tg_admin_role", "superadmin");
      }

      router.replace("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4">
        <p className="text-sm text-[#6B7280]">Checking setup status...</p>
      </main>
    );
  }

  if (!needsSetup) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-8 text-[#050816] sm:px-6 md:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E]">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#111827] md:text-3xl">
                Create superadmin
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                First-time setup for TertiaryGuide. This account will manage the
                entire admin panel and other admin users.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="setup-username" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Username
              </label>
              <input
                id="setup-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="setup-email" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Email
              </label>
              <input
                id="setup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tertiaryguide.com"
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="setup-password" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Password
              </label>
              <PasswordInput
                id="setup-password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>

            <div>
              <label htmlFor="setup-confirm-password" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Confirm password
              </label>
              <PasswordInput
                id="setup-confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
            >
              {submitting ? "Creating superadmin..." : "Create superadmin & continue"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#6B7280]">
            Already have an account?{" "}
            <Link href="/admin/signin" className="font-medium text-[#2563EB] hover:underline">
              Sign in
            </Link>
          </p>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-4 flex items-center gap-2 text-[#111827]">
            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-base font-semibold">What you get as superadmin</h2>
          </div>
          <ul className="space-y-3 text-sm text-[#4B5563]">
            <li>Full access to forms, users, analytics, blog, ads, and checkers.</li>
            <li>Create and remove regular admin accounts from the Admin team tab.</li>
            <li>Reset admin passwords when staff get locked out.</li>
            <li>Change your own password anytime under Settings.</li>
          </ul>
          <p className="mt-6 rounded-xl bg-[#F9FAFB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
            This setup page only works while no superadmin exists. After the first
            account is created, new staff must be added by a signed-in superadmin.
          </p>
        </section>
      </div>
    </main>
  );
}
