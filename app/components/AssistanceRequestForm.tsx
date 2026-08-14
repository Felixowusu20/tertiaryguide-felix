"use client";

import React, { useState } from "react";

type AssistanceMedium = "call" | "sms" | "whatsapp" | "email";

type AssistanceRequestFormProps = {
  variant: "drawer" | "page";
  onClose?: () => void;
};

export function AssistanceRequestForm({
  variant,
  onClose,
}: AssistanceRequestFormProps) {
  const [step, setStep] = useState<"medium" | "contact">("medium");
  const [medium, setMedium] = useState<AssistanceMedium | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const shellClass =
    variant === "drawer"
      ? "w-full space-y-4 rounded-[32px] border border-[#E0E0E0] bg-white p-6 shadow-xl transition-all sm:absolute sm:right-0 sm:top-0 sm:z-20 sm:w-[320px]"
      : "w-full max-w-lg space-y-4 rounded-[32px] border border-[#E0E0E0] bg-white p-6 shadow-xl sm:p-8";

  return (
    <div className={shellClass}>
      {isSubmitted ? (
        <div className="space-y-2 py-2">
          <p className="text-base font-bold text-[#1E1E1E]">Request received</p>
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
                      className={`rounded-2xl border px-3 py-2.5 text-[11px] font-semibold capitalize transition ${
                        medium === option
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
                          ...(userEmail ? { requesterEmail: userEmail } : {}),
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
                  {isSubmitting ? "Sending..." : "Submit"}
                </button>
              </div>
              {submitError && (
                <p className="text-center text-[10px] font-medium text-[#DC2626]">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => onClose?.()}
        className="mt-2 w-full text-[10px] font-bold uppercase tracking-widest text-[#9E9E9E] hover:text-[#1E1E1E]"
      >
        Cancel
      </button>
    </div>
  );
}
