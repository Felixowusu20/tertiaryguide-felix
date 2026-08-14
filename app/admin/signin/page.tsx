"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PasswordInput } from "@/app/components/PasswordInput";

export default function AdminSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4">
          <p className="text-sm text-[#6B7280]">Loading admin sign in...</p>
        </main>
      }
    >
      <AdminSignInContent />
    </Suspense>
  );
}

function AdminSignInContent() {
  const router = useRouter();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteSchoolName, setInviteSchoolName] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setToast("Password reset successfully. You can sign in now.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite")?.trim();
    if (!invite) return;

    let cancelled = false;
    async function validateInvite() {
      try {
        setCheckingInvite(true);
        setInviteError(null);
        const res = await fetch(
          `/api/admin/portal-invite?token=${encodeURIComponent(invite!)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setInviteError(
            data.error ||
              "This invitation link is invalid or has expired.",
          );
          setInviteSchoolName(null);
          return;
        }
        setInviteSchoolName(
          typeof data.schoolName === "string" ? data.schoolName : "your school",
        );
        setInviteExpiresAt(
          typeof data.expiresAt === "string" ? data.expiresAt : null,
        );
      } catch {
        if (!cancelled) {
          setInviteError("Could not validate this invitation link.");
        }
      } finally {
        if (!cancelled) setCheckingInvite(false);
      }
    }

    void validateInvite();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkSetup() {
      try {
        const res = await fetch("/api/admin/setup/status");
        const data = await res.json();
        if (cancelled || !res.ok) return;

        if (data.needsSetup) {
          setNeedsSetup(true);
          router.replace("/admin/setup");
        }
      } catch {
        // allow sign-in attempt if status check fails
      } finally {
        if (!cancelled) setCheckingSetup(false);
      }
    }

    void checkSetup();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid admin credentials");
        return;
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tg_admin_username", data.admin.username);
          const role =
            data.admin.role === "superadmin"
              ? "superadmin"
              : data.admin.role === "school_admin"
                ? "school_admin"
                : "admin";
          window.localStorage.setItem("tg_admin_role", role);
          if (role === "school_admin" && data.admin.schoolSlug) {
            window.localStorage.setItem("tg_school_slug", data.admin.schoolSlug);
            if (data.admin.schoolId) {
              window.localStorage.setItem("tg_school_id", data.admin.schoolId);
            }
          } else {
            window.localStorage.removeItem("tg_school_slug");
            window.localStorage.removeItem("tg_school_id");
          }
        }
      } catch {
        // ignore storage errors
      }

      setToast("Admin signed in successfully.");

      setTimeout(() => {
        setToast(null);
        if (data.admin.role === "school_admin" && data.admin.schoolSlug) {
          router.push(`/admin/${data.admin.schoolSlug}`);
        } else {
          router.push("/admin");
        }
      }, 900);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSetup || needsSetup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <p className="text-sm text-[#6B7280]">Loading admin sign in...</p>
      </main>
    );
  }

  const canSubmit = Boolean(username.trim() && password.trim() && !submitting);

  return (
    <main className="relative min-h-screen bg-white text-[#050816]">
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1E1E1E] px-4 py-3 text-sm text-white shadow-lg shadow-black/20">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-xs font-semibold">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Visual panel — photo only, no overlay copy */}
        <aside className="relative hidden overflow-hidden bg-[#0B1220] lg:block">
          <Image
            src="/admin/signin-promo.png"
            alt="TertiaryGuide on mobile"
            fill
            priority
            className="object-cover object-center"
            sizes="50vw"
            quality={95}
          />
          <div className="absolute left-8 top-8 z-10 xl:left-10 xl:top-10">
            <Link href="/" className="inline-flex w-fit items-center gap-2">
              <Image
                src="/hero/logoTguide.png"
                alt="TertiaryGuide"
                width={160}
                height={40}
                className="h-9 w-auto drop-shadow-md"
              />
            </Link>
          </div>
        </aside>

        {/* Form panel */}
        <section className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-8 md:px-12 lg:px-14 xl:px-20">
          {/* Mobile brand strip */}
          <div className="absolute inset-x-0 top-0 h-40 overflow-hidden lg:hidden">
            <Image
              src="/admin/signin-promo.png"
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
              quality={90}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:mb-10">
              <Link href="/" className="inline-flex lg:hidden">
                <Image
                  src="/hero/logoTguide.png"
                  alt="TertiaryGuide"
                  width={140}
                  height={36}
                  className="h-8 w-auto"
                />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#E8EEF5] bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#007AFF]">
                  {inviteSchoolName ? "School portal" : "Administration"}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">
                  {inviteSchoolName ? "School portal sign in" : "Admin Sign In"}
                </h1>
                <p className="text-sm leading-relaxed text-[#64748B]">
                  {inviteSchoolName
                    ? "Sign in with the username and password shared by TertiaryGuide administrators."
                    : "Use your admin credentials to access the dashboard."}
                </p>
              </div>

              {checkingInvite && (
                <p className="mt-4 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
                  Checking your invitation link…
                </p>
              )}

              {inviteSchoolName && !inviteError && (
                <div className="mt-4 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
                  <p className="font-semibold">
                    Welcome, {inviteSchoolName}
                  </p>
                  <p className="mt-1 text-[#1D4ED8]/90">
                    Your TertiaryGuide school portal is ready. Enter the
                    credentials provided by TertiaryGuide to continue.
                    {inviteExpiresAt
                      ? ` This invite is valid until ${new Date(
                          inviteExpiresAt,
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}.`
                      : ""}
                  </p>
                </div>
              )}

              {inviteError && (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {inviteError}
                </p>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-[#111827]"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="block w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
                    placeholder="Enter your username"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[#111827]"
                    >
                      Password
                    </label>
                    <Link
                      href="/admin/recover?mode=password"
                      className="text-xs font-semibold text-[#007AFF] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="block w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[#B91C1C]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`mt-1 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white transition ${
                    canSubmit
                      ? "bg-[#007AFF] shadow-sm shadow-[#007AFF]/25 hover:bg-[#0062CC]"
                      : "cursor-not-allowed bg-[#CBD5E1]"
                  }`}
                >
                  {submitting ? "Signing in..." : "Sign In"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-8 space-y-3 border-t border-[#F1F5F9] pt-6 text-sm text-[#64748B]">
                <p>
                  Forgot your admin email?{" "}
                  <Link
                    href="/admin/recover?mode=email"
                    className="font-semibold text-[#007AFF] hover:underline"
                  >
                    Recover or update it
                  </Link>
                </p>
                <p>
                  Forgot your username?{" "}
                  <Link
                    href="/admin/recover?mode=username"
                    className="font-semibold text-[#007AFF] hover:underline"
                  >
                    Recover or update it
                  </Link>
                </p>
                <p>
                  First time here?{" "}
                  <Link
                    href="/admin/setup"
                    className="font-semibold text-[#007AFF] hover:underline"
                  >
                    Create the superadmin account
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-[#94A3B8]">
              Reserved for verified TertiaryGuide administrators
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
