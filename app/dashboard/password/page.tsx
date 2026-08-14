"use client";

import React, { useState } from "react";
import { PasswordInput } from "@/app/components/PasswordInput";

export default function PasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;

    setError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

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

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          currentPassword: oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        return;
      }

      setToast("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setToast(null), 2000);
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
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-xs font-semibold">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold leading-tight">Change Password</h1>
        <p className="text-sm text-[#555555]">
          Update your account password below
        </p>
      </div>

      <div className="space-y-6 md:max-w-xl">
        {/* Old Password */}
        <div>
          <label className="mb-1 block text-sm text-gray-600">Old Password</label>
          <PasswordInput
            id="old-password"
            value={oldPassword}
            onChange={setOldPassword}
            placeholder="Enter old password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pr-10 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">New Password</label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter new password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pr-10 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Confirm Password</label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pr-10 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {error && (
          <p className="text-sm text-[#E33F3F]">{error}</p>
        )}

        <div className="pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-[#007AFF] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:bg-[#9EC8FF]"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
