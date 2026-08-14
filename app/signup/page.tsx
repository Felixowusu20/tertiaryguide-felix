"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, GraduationCap, Sparkles } from "lucide-react";
import { PasswordInput } from "@/app/components/PasswordInput";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>(
    [],
  );
  const usernameCheckTimeout = useRef<number | null>(null);

  const stepOneValid = username.trim() && email.trim() && phone.trim();
  const passwordsValid =
    password.trim() && confirmPassword.trim() && password === confirmPassword;
  const isOtpComplete = otp.every((digit) => digit !== "");

  const resetOtpAndTimer = () => {
    setOtp(["", "", "", "", "", ""]);
    setTimer(59);
  };

  const handleStepOneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepOneValid) return;
    setStep(2);
  };

  // Countdown timer logic
  useEffect(() => {
    if (step !== 3 || timer <= 0) return;

    const id = window.setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [step, timer]);

  const handleOtpChange = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, "");
    const next = [...otp];

    if (numeric === "") {
      next[index] = "";
      setOtp(next);
      return;
    }

    // Take only the last digit typed
    next[index] = numeric[numeric.length - 1];
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
      const prevIndex = index - 1;
      otpRefs.current[prevIndex]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
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

    const lastIndex = chars.length - 1;
    if (lastIndex >= 0 && lastIndex < otpRefs.current.length) {
      otpRefs.current[lastIndex]?.focus();
    }
  };

  const formattedTimer = `00:${timer.toString().padStart(2, "0")}s`;

  // Live username availability check
  useEffect(() => {
    // Reset state when username changes
    setUsernameAvailable(null);
    setUsernameSuggestions([]);

    const value = username.trim();
    if (!value) {
      if (usernameCheckTimeout.current) {
        window.clearTimeout(usernameCheckTimeout.current);
        usernameCheckTimeout.current = null;
      }
      return;
    }

    if (usernameCheckTimeout.current) {
      window.clearTimeout(usernameCheckTimeout.current);
    }

    usernameCheckTimeout.current = window.setTimeout(async () => {
      try {
        setUsernameChecking(true);

        const res = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: value }),
        });

        const data = await res.json();
        if (!res.ok) {
          setUsernameAvailable(null);
          return;
        }

        setUsernameAvailable(Boolean(data.available));
        setUsernameSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => {
      if (usernameCheckTimeout.current) {
        window.clearTimeout(usernameCheckTimeout.current);
        usernameCheckTimeout.current = null;
      }
    };
  }, [username]);

  const handleResendOtp = async () => {
    if (timer > 0) return;

    resetOtpAndTimer();

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data?.otp) {
        console.log("TertiaryGuide OTP (resend):", data.otp);
      }

      if (!res.ok) {
        setSubmitError(data.error || "Could not resend verification code.");
        return;
      }

      if (data?.devMessage) {
        setToastMessage(data.devMessage);
      } else {
        setToastMessage("OTP sent to " + (email || "your email"));
      }
    } catch {
      console.error("Failed to resend OTP");
    }
  };

  const handleFinalSignup = async () => {
    if (!isOtpComplete || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      // First, verify the OTP code
      const otpCode = otp.join("");
      try {
        const verifyRes = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code: otpCode,
          }),
        });

        const verifyData = await verifyRes.json();
        console.log("[signup] OTP verify response", verifyRes.status, verifyData);

        if (!verifyRes.ok) {
          setSubmitError(verifyData.error || "Invalid or expired OTP code.");
          return;
        }
      } catch (error) {
        console.error("[signup] OTP verify error", error);
        setSubmitError("Could not verify OTP. Please try again.");
        return;
      }

      // If OTP verification succeeds, create the account
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          phone,
          password,
        }),
      });

      const data = await res.json();
      console.log("[signup] Signup response", res.status, data);
      if (!res.ok) {
        setSubmitError(data.error || "Failed to create account");
        return;
      }

      // Show a sleek success toast and navigate to dashboard personal info.
      setToastMessage("Signup successful. Welcome to TertiaryGuide!");
      resetOtpAndTimer();

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tg_user_email", email);
        }
      } catch {
        // ignore storage errors
      }

      setTimeout(() => {
        router.push(redirect);
      }, 900);
    } catch (error) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-6 text-[#1E1E1E] md:px-10 lg:px-16">
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1E1E1E] px-4 py-3 text-sm text-white shadow-lg shadow-black/20">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-xs font-semibold">
              ✓
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-16 md:flex-row md:items-center md:justify-between">
        {/* Left: form area */}
        <section className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {step === 1
                ? "Create an account"
                : step === 2
                  ? "Create a Password"
                  : "Enter OTP"}
            </h1>
            {step === 3 && (
              <p className="mt-2 text-sm text-[#555555]">
                Enter the OTP sent to
                <span className="font-medium text-[#1E1E1E]">
                  {" "}
                  {email || "example@email.com"}
                </span>
              </p>
            )}
          </div>

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleStepOneSubmit}>
              {/* Username */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
                {username && (
                  <div className="mt-1 space-y-1 text-xs">
                    {usernameChecking && (
                      <p className="text-[#9E9E9E]">Checking username...</p>
                    )}
                    {!usernameChecking && usernameAvailable === true && (
                      <p className="text-[#16A34A]">
                        Username is available
                      </p>
                    )}
                    {!usernameChecking &&
                      usernameAvailable === false && (
                        <>
                          {usernameSuggestions.length > 0 ? (
                            <div className="space-y-2">
                              {/* Primary recommended suggestion */}
                              <div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-3 py-2">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-medium text-[#6B7280]">
                                    Recommended username
                                  </span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {usernameSuggestions[0]}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chosen = usernameSuggestions[0];
                                    setUsername(chosen);
                                    setToastMessage(
                                      `Using username "${chosen}"`,
                                    );
                                  }}
                                  className="rounded-full bg-[#007AFF] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0062CC]"
                                >
                                  Use
                                </button>
                              </div>

                              {/* Other alternatives as chips */}
                              {usernameSuggestions.length > 1 && (
                                <div className="space-y-1">
                                  <p className="text-[#E33F3F]">
                                    Username is taken. Try one of these:
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {usernameSuggestions
                                      .slice(1, 5)
                                      .map((suggestion) => (
                                        <button
                                          key={suggestion}
                                          type="button"
                                          onClick={() => setUsername(suggestion)}
                                          className="rounded-full border border-[#E0E0E0] px-3 py-1 text-[11px] text-[#1E1E1E] hover:border-[#007AFF]"
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[#E33F3F]">
                              Username is taken. Try a slightly different one.
                            </p>
                          )}
                        </>
                      )}
                  </div>
                )}
              </div>

              {/* Email */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>

              {/* Continue button */}
              <button
                type="submit"
                disabled={!stepOneValid}
                className={`mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${stepOneValid ? "bg-[#007AFF]" : "bg-[#E0E0E0]"
                  }`}
              >
                Continue
              </button>
            </form>
          ) : step === 2 ? (
            <form
              className="space-y-6"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!passwordsValid || submitting) return;

                resetOtpAndTimer();
                setStep(3);

                try {
                  const res = await fetch("/api/auth/request-otp", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                  });

                  const data = await res.json();
                  if (data?.otp) {
                    console.log("TertiaryGuide OTP:", data.otp);
                  }

                  if (!res.ok) {
                    setSubmitError(data.error || "Could not send verification code.");
                    setStep(2);
                    return;
                  }

                  if (data?.devMessage) {
                    setToastMessage(data.devMessage);
                  } else {
                    setToastMessage("OTP sent to " + (email || "your email"));
                  }
                } catch {
                  console.error("Failed to request OTP");
                }
              }}
            >
              {/* Create Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Create Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-[#1E1E1E]"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              </div>

              {/* Create Account button */}
              <button
                type="submit"
                disabled={!passwordsValid}
                className={`mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${passwordsValid ? "bg-[#007AFF]" : "bg-[#E0E0E0]"
                  }`}
              >
                Create Account
              </button>
            </form>
          ) : (
            <div className="space-y-8">
              {/* OTP boxes */}
              <div className="mt-4 flex gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={otp[index]}
                    onChange={(event) =>
                      handleOtpChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] text-center text-lg font-medium text-[#1E1E1E] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="font-medium text-[#E33F3F]">
                  {formattedTimer}
                </span>
                <span className="text-[#555555]">
                  Didn&apos;t get the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className={`font-medium ${timer > 0
                      ? "cursor-not-allowed text-[#9E9E9E]"
                      : "text-[#007AFF]"
                      }`}
                    disabled={timer > 0}
                  >
                    Resend
                  </button>
                </span>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  className={`flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${isOtpComplete && !submitting
                    ? "bg-[#007AFF]"
                    : "bg-[#E0E0E0]"
                    }`}
                  disabled={!isOtpComplete || submitting}
                  onClick={handleFinalSignup}
                >
                  {submitting ? "Creating Account..." : "Create Account"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-xl bg-[#E33F3F] py-3 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <p className="pt-2 text-center text-xs text-[#E33F3F]">
              {submitError}
            </p>
          )}

          <p className="pt-2 text-center text-xs text-[#555555]">
            Already have an account?{" "}
            <Link href={`/signin${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="font-medium text-[#007AFF]">
              Sign In
            </Link>
          </p>
        </section>

        {/* Right: same benefits as sign-in */}
        <section className="w-full max-w-md space-y-8 text-sm text-[#1E1E1E]">
          <BenefitItem
            icon={Compass}
            title="Welcome to TertiaryGuide"
            description="Your trusted gateway to a smooth and stress-free admission process, guiding you every step of the way from application to acceptance."
          />
          <BenefitItem
            icon={GraduationCap}
            title="Start Your Admission Journey"
            description="Create an account to unlock personalized insights about tertiary institutions, tailored admission requirements, and programs that best fit your goals."
          />
          <BenefitItem
            icon={Sparkles}
            title="Achieve More, Stress Less"
            description="Streamline your path to educational success with us and move one step closer to your academic goals."
          />
        </section>
      </div>
    </main>
  );
}

type BenefitItemProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

function BenefitItem({ title, description, icon: Icon }: BenefitItemProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#007AFF]">
        <Icon className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold leading-snug text-[#007AFF]">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-[#555555]">{description}</p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center text-sm text-gray-500">Loading...</div>
      </main>
    }>
      <SignUpContent />
    </Suspense>
  );
}
