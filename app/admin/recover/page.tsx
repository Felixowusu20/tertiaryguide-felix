"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { PasswordInput } from "@/app/components/PasswordInput";

type RecoveryMode = "password" | "email" | "username";
type Step = 1 | 2 | 3;

export default function AdminRecoverPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4">
          <p className="text-sm text-[#6B7280]">Loading account recovery...</p>
        </main>
      }
    >
      <AdminRecoverContent />
    </Suspense>
  );
}

function AdminRecoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: RecoveryMode =
    searchParams.get("mode") === "email"
      ? "email"
      : searchParams.get("mode") === "username"
        ? "username"
        : "password";

  const [mode, setMode] = useState<RecoveryMode>(initialMode);
  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [recoveredEmail, setRecoveredEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [recoveredUsername, setRecoveredUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [timer, setTimer] = useState(59);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const identifierTrim = identifier.trim();
  const isEmailIdentifier = identifierTrim.includes("@");
  const identifierValid =
    mode === "email"
      ? identifierTrim.length >= 2
      : mode === "username"
        ? /^\S+@\S+\.\S{2,}$/.test(identifierTrim)
      : isEmailIdentifier
        ? /^\S+@\S+\.\S{2,}$/.test(identifierTrim)
        : identifierTrim.length >= 2;

  const isOtpComplete = otp.every((digit) => digit !== "");
  const passwordsValid =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    confirmPassword.length > 0;
  const newEmailValid = !newEmail.trim() || /^\S+@\S+\.\S{2,}$/.test(newEmail.trim());

  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const id = window.setInterval(() => {
      setTimer((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step, timer]);

  const resetFlow = (nextMode: RecoveryMode) => {
    setMode(nextMode);
    setStep(1);
    setIdentifier("");
    setResolvedEmail("");
    setMaskedEmail("");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setNewEmail("");
    setRecoveredEmail("");
    setNewUsername("");
    setRecoveredUsername("");
    setError(null);
    setInfo(null);
    setTimer(59);
  };

  const handleOtpChange = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, "");
    const next = [...otp];
    if (numeric === "") {
      next[index] = "";
      setOtp(next);
      return;
    }
    next[index] = numeric[numeric.length - 1]!;
    setOtp(next);
    const nextIndex = index + 1;
    if (nextIndex < otpRefs.current.length) {
      otpRefs.current[nextIndex]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const chars = pasted.slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    chars.forEach((char, index) => {
      next[index] = char;
    });
    setOtp(next);
    const last = Math.min(chars.length - 1, 5);
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const requestPasswordCode = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const payload = isEmailIdentifier
        ? { email: identifierTrim.toLowerCase() }
        : { username: identifierTrim };

      const res = await fetch("/api/admin/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      const emailForReset =
        typeof data.email === "string"
          ? data.email
          : isEmailIdentifier
            ? identifierTrim.toLowerCase()
            : "";

      if (!emailForReset) {
        setInfo(
          "If a matching admin account exists, we sent a 6-digit code to the email on file.",
        );
      } else {
        setResolvedEmail(emailForReset);
        setMaskedEmail(
          typeof data.maskedEmail === "string"
            ? data.maskedEmail
            : emailForReset,
        );
        setInfo(
          `If a matching admin account exists, we sent a 6-digit code to ${data.maskedEmail || "your registered email"}.`,
        );
      }

      setStep(2);
      setTimer(59);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestEmailCode = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/request-email-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifierTrim }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setMaskedEmail(typeof data.maskedEmail === "string" ? data.maskedEmail : "");
      setInfo(
        data.maskedEmail
          ? `If a matching admin account exists, we sent a code to ${data.maskedEmail}.`
          : "If a matching admin account exists, we sent a 6-digit code to the email on file.",
      );
      setStep(2);
      setTimer(59);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestUsernameCode = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/request-username-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifierTrim.toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResolvedEmail(identifierTrim.toLowerCase());
      setMaskedEmail(typeof data.maskedEmail === "string" ? data.maskedEmail : "");
      setInfo(
        data.maskedEmail
          ? `If a matching admin account exists, we sent a code to ${data.maskedEmail}.`
          : "If a matching admin account exists, we sent a 6-digit code to the email on file.",
      );
      setStep(2);
      setTimer(59);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep1 = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifierValid || submitting) return;

    if (mode === "password") {
      await requestPasswordCode();
      return;
    }

    if (mode === "username") {
      await requestUsernameCode();
      return;
    }

    await requestEmailCode();
  };

  const handleResend = async () => {
    if (timer > 0 || submitting) return;
    setOtp(["", "", "", "", "", ""]);
    if (mode === "password") {
      await requestPasswordCode();
      return;
    }
    if (mode === "username") {
      await requestUsernameCode();
      return;
    }
    await requestEmailCode();
  };

  const handleStep2 = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOtpComplete) return;
    setError(null);
    setStep(3);
  };

  const completePasswordReset = async () => {
    const email = resolvedEmail || (isEmailIdentifier ? identifierTrim.toLowerCase() : "");
    if (!email) {
      setError("Enter the admin email tied to your account and request a new code.");
      setStep(1);
      return;
    }

    const res = await fetch("/api/admin/complete-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: otp.join(""),
        newPassword,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not reset password.");
      return;
    }

    router.push("/admin/signin?reset=success");
  };

  const completeEmailRecovery = async () => {
    const res = await fetch("/api/admin/complete-email-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: identifierTrim,
        code: otp.join(""),
        newEmail: newEmail.trim() || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not recover email.");
      return;
    }

    setRecoveredEmail(typeof data.email === "string" ? data.email : "");
    setInfo(
      data.updated
        ? "Your admin email has been updated successfully."
        : "Here is the email currently linked to your admin account.",
    );
    setError(null);
  };

  const completeUsernameRecovery = async () => {
    const email = resolvedEmail || identifierTrim.toLowerCase();
    const res = await fetch("/api/admin/complete-username-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: otp.join(""),
        newUsername: newUsername.trim() || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not recover username.");
      return;
    }

    setRecoveredUsername(typeof data.username === "string" ? data.username : "");
    setInfo(
      data.updated
        ? "Your admin username has been updated successfully."
        : "Here is the username currently linked to your admin account.",
    );
    setError(null);
  };

  const handleFinal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (mode === "password") {
      if (!passwordsValid) return;
      setSubmitting(true);
      setError(null);
      try {
        await completePasswordReset();
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "username") {
      if (newUsername.trim() && newUsername.trim().length < 3) return;
      setSubmitting(true);
      setError(null);
      try {
        await completeUsernameRecovery();
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!newEmailValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeEmailRecovery();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}s`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-8 text-[#050816]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 md:flex-row md:items-start">
        <section className="w-full max-w-md space-y-6 rounded-3xl border border-[#DBEAFE] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#007AFF]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF]">
                Admin account recovery
              </h1>
              <p className="text-sm text-[#6B7280]">
                Reset your password or recover your admin email or username.
              </p>
            </div>
          </div>

          <div className="flex gap-2 rounded-2xl border border-[#E5EFFD] bg-[#F8FBFF] p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => resetFlow("password")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 ${
                mode === "password"
                  ? "bg-white text-[#007AFF] shadow-sm"
                  : "text-[#4B5563] hover:text-[#007AFF]"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </button>
            <button
              type="button"
              onClick={() => resetFlow("email")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 ${
                mode === "email"
                  ? "bg-white text-[#007AFF] shadow-sm"
                  : "text-[#4B5563] hover:text-[#007AFF]"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => resetFlow("username")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 ${
                mode === "username"
                  ? "bg-white text-[#007AFF] shadow-sm"
                  : "text-[#4B5563] hover:text-[#007AFF]"
              }`}
            >
              <UserRound className="h-3.5 w-3.5" />
              Username
            </button>
          </div>

          {info && (
            <p className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E3A5F]">
              {info}
            </p>
          )}

          {step === 1 && (
            <form className="space-y-5" onSubmit={(event) => void handleStep1(event)}>
              <div className="space-y-2">
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-[#111827]"
                >
                  {mode === "password"
                    ? "Admin email or username"
                    : mode === "email"
                      ? "Admin username"
                      : "Registered admin email"}
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  placeholder={
                    mode === "password"
                      ? "you@example.com or superadmin"
                      : mode === "email"
                        ? "superadmin"
                        : "you@example.com"
                  }
                />
              </div>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <button
                type="submit"
                disabled={!identifierValid || submitting}
                className={`flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${
                  identifierValid && !submitting
                    ? "bg-[#007AFF] hover:bg-[#0062CC]"
                    : "cursor-not-allowed bg-[#E0E0E0]"
                }`}
              >
                {submitting ? "Sending…" : "Send verification code"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-5" onSubmit={handleStep2}>
              <p className="text-sm text-[#6B7280]">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-[#111827]">
                  {maskedEmail || "your registered email"}
                </span>
                .
              </p>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-11 w-9 rounded-lg border border-[#E0E0E0] text-center text-base font-medium outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] sm:h-12 sm:w-10"
                  />
                ))}
              </div>

              <p className="text-center text-xs text-[#6B7280]">
                Resend in {formattedTimer}
                {timer === 0 && (
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    className="ml-2 font-medium text-[#007AFF] hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </p>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isOtpComplete}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                    isOtpComplete
                      ? "bg-[#007AFF] hover:bg-[#0062CC]"
                      : "cursor-not-allowed bg-[#E0E0E0]"
                  }`}
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {step === 3 && mode === "password" && (
            <form className="space-y-5" onSubmit={(event) => void handleFinal(event)}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#111827]">
                  New password
                </label>
                <PasswordInput
                  id="admin-reset-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#111827]">
                  Confirm new password
                </label>
                <PasswordInput
                  id="admin-reset-confirm-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  className="rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!passwordsValid || submitting}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                    passwordsValid && !submitting
                      ? "bg-[#007AFF] hover:bg-[#0062CC]"
                      : "cursor-not-allowed bg-[#E0E0E0]"
                  }`}
                >
                  {submitting ? "Saving…" : "Reset password"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && mode === "email" && (
            <form className="space-y-5" onSubmit={(event) => void handleFinal(event)}>
              {recoveredEmail ? (
                <div className="rounded-2xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#166534]">
                    Linked admin email
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#111827]">
                    {recoveredEmail}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#6B7280]">
                    Leave the field below blank to only view your current email, or
                    enter a new email to update your admin account.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#111827]">
                      New email (optional)
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                      placeholder="new-email@example.com"
                    />
                  </div>
                </>
              )}

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                {!recoveredEmail ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(2);
                        setError(null);
                      }}
                      className="rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !newEmailValid}
                      className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                        !submitting && newEmailValid
                          ? "bg-[#007AFF] hover:bg-[#0062CC]"
                          : "cursor-not-allowed bg-[#E0E0E0]"
                      }`}
                    >
                      {submitting ? "Verifying…" : "Recover email"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/admin/signin"
                    className="flex w-full items-center justify-center rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white hover:bg-[#0062CC]"
                  >
                    Back to admin sign in
                  </Link>
                )}
              </div>
            </form>
          )}

          {step === 3 && mode === "username" && (
            <form className="space-y-5" onSubmit={(event) => void handleFinal(event)}>
              {recoveredUsername ? (
                <div className="rounded-2xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#166534]">
                    Linked admin username
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#111827]">
                    {recoveredUsername}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#6B7280]">
                    Leave the field below blank to only view your current username,
                    or enter a new username to update your admin account.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#111827]">
                      New username (optional)
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                      className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                      placeholder="new-admin-username"
                    />
                  </div>
                </>
              )}

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                {!recoveredUsername ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(2);
                        setError(null);
                      }}
                      className="rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (newUsername.trim().length > 0 && newUsername.trim().length < 3)}
                      className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white ${
                        !submitting &&
                        !(newUsername.trim().length > 0 && newUsername.trim().length < 3)
                          ? "bg-[#007AFF] hover:bg-[#0062CC]"
                          : "cursor-not-allowed bg-[#E0E0E0]"
                      }`}
                    >
                      {submitting ? "Verifying…" : "Recover username"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/admin/signin"
                    className="flex w-full items-center justify-center rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white hover:bg-[#0062CC]"
                  >
                    Back to admin sign in
                  </Link>
                )}
              </div>
            </form>
          )}

          <p className="text-center text-xs text-[#6B7280]">
            Remember your credentials?{" "}
            <Link href="/admin/signin" className="font-medium text-[#007AFF] hover:underline">
              Admin sign in
            </Link>
          </p>
        </section>

        <section className="w-full max-w-md space-y-4 rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-white to-[#F8FBFF] p-6 text-sm text-[#4B5563] shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <Image
              src="/hero/logoTguide.png"
              alt="TertiaryGuide"
              width={130}
              height={30}
              className="h-7 w-auto"
            />
          </div>
          <p>
            This recovery flow works for both admin and superadmin accounts. We
            send a one-time code to the email already linked to the account.
          </p>
          <p>
            If you forgot your password, use your admin email or username. If you
            forgot your email, enter your username. If you forgot your username,
            enter your registered email. After verification, you can recover or
            update either credential.
          </p>
          <p className="text-xs text-[#6B7280]">
            If you are the only superadmin and cannot access email, use the CLI
            break-glass script documented in setup.
          </p>
        </section>
      </div>
    </main>
  );
}
