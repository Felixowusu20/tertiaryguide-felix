"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [timer, setTimer] = useState(59);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailTrim = email.trim();
  const emailValid = /^\S+@\S+\.\S{2,}$/.test(emailTrim);
  const isOtpComplete = otp.every((d) => d !== "");
  const passwordsValid =
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    confirmPassword.length > 0;

  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const id = window.setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step, timer]);

  const resetTimer = () => setTimer(59);

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
    chars.forEach((ch, idx) => {
      next[idx] = ch;
    });
    setOtp(next);
    const last = Math.min(chars.length - 1, 5);
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const requestCode = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setInfo(
        "If an account with this email exists, we sent a 6-digit code. Check your inbox and spam folder.",
      );
      setStep(2);
      resetTimer();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || submitting) return;
    void requestCode();
  };

  const handleResend = async () => {
    if (timer > 0 || submitting) return;
    setOtp(["", "", "", "", "", ""]);
    await requestCode();
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpComplete) return;
    setError(null);
    setStep(3);
  };

  const handleFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim,
          code: otp.join(""),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }
      router.push("/signin?reset=success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}s`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#1E1E1E] md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-xl flex-col space-y-10">
        <section className="w-full space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {step === 1
                ? "Forgot password?"
                : step === 2
                  ? "Enter verification code"
                  : "Create a new password"}
            </h1>
            {step === 2 && (
              <p className="mt-2 text-sm text-[#555555]">
                We sent a code to{" "}
                <span className="font-medium text-[#1E1E1E]">
                  {emailTrim || "your email"}
                </span>
              </p>
            )}
            {step === 3 && (
              <p className="mt-2 text-sm text-[#555555]">
                Choose a new password for your account.
              </p>
            )}
          </div>

          {info && step === 2 && (
            <p className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E3A5F]">
              {info}
            </p>
          )}

          {step === 1 && (
            <form className="space-y-6" onSubmit={handleStep1}>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <button
                type="submit"
                disabled={!emailValid || submitting}
                className={`mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${
                  emailValid && !submitting
                    ? "bg-[#007AFF] hover:bg-[#0062CC]"
                    : "cursor-not-allowed bg-[#E0E0E0] text-white"
                }`}
              >
                {submitting ? "Sending…" : "Continue"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-6" onSubmit={handleStep2}>
              <div>
                <div className="mt-1 flex items-center justify-center gap-1.5 sm:gap-2">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      // eslint-disable-next-line react/no-array-index-key
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      inputMode="numeric"
                      maxLength={1}
                      className="h-11 w-9 rounded-lg border border-[#E0E0E0] text-center text-base font-medium outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] sm:h-12 sm:w-10"
                    />
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-[#6B7280]">
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
              </div>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="order-2 rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] sm:order-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isOtpComplete}
                  className={`order-1 flex-1 rounded-xl py-3 text-sm font-semibold text-white sm:order-2 ${
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

          {step === 3 && (
            <form className="space-y-6" onSubmit={handleFinal}>
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 right-3 flex items-center text-[#9E9E9E]"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#6B7280]">At least 6 characters</p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showPw2 ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2(!showPw2)}
                    className="absolute inset-y-0 right-3 flex items-center text-[#9E9E9E]"
                    aria-label={showPw2 ? "Hide password" : "Show password"}
                  >
                    {showPw2 ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  className="order-2 rounded-xl border border-[#E5E7EB] py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] sm:order-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!passwordsValid || submitting}
                  className={`order-1 flex-1 rounded-xl py-3 text-sm font-semibold text-white sm:order-2 ${
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

          <p className="pt-2 text-center text-xs text-[#555555]">
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-[#007AFF]">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
