"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  KeyRound,
  Loader2,
  Palette,
  Plus,
  Save,
  Ticket,
  X,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { PasswordInput } from "@/app/components/PasswordInput";
import {
  BRAND_COLOR_PRESETS,
  MAX_BRAND_COLORS,
  blendBrandColors,
  brandGradient,
  normalizeBrandColor,
  normalizeBrandColors,
  toDateInputValue,
} from "@/lib/brand-theme";

type Props = {
  slug: string;
  deadline: string | null;
  brandColor: string;
  brandColors?: string[];
  voucherPrice: number | null;
  undergraduateVoucherPrice: number | null;
  postgraduateVoucherPrice: number | null;
  description: string | null;
  onSaved: (school: {
    deadline: string | null;
    brandColor: string;
    brandColors: string[];
    voucherPrice: number | null;
    undergraduateVoucherPrice: number | null;
    postgraduateVoucherPrice: number | null;
    description: string | null;
  }) => void;
  onError: (message: string | null) => void;
};

export function SettingsSection({
  slug,
  deadline,
  brandColor,
  brandColors,
  voucherPrice,
  undergraduateVoucherPrice,
  postgraduateVoucherPrice,
  description,
  onSaved,
  onError,
}: Props) {
  const [deadlineValue, setDeadlineValue] = useState(toDateInputValue(deadline));
  const [colors, setColors] = useState<string[]>(() =>
    normalizeBrandColors(brandColors, brandColor),
  );
  const [undergradPriceValue, setUndergradPriceValue] = useState(
    (undergraduateVoucherPrice ?? voucherPrice) != null
      ? String(undergraduateVoucherPrice ?? voucherPrice)
      : "",
  );
  const [postgradPriceValue, setPostgradPriceValue] = useState(
    postgraduateVoucherPrice != null ? String(postgraduateVoucherPrice) : "",
  );
  const [about, setAbout] = useState(description || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    setDeadlineValue(toDateInputValue(deadline));
    setColors(normalizeBrandColors(brandColors, brandColor));
    setUndergradPriceValue(
      (undergraduateVoucherPrice ?? voucherPrice) != null
        ? String(undergraduateVoucherPrice ?? voucherPrice)
        : "",
    );
    setPostgradPriceValue(
      postgraduateVoucherPrice != null ? String(postgraduateVoucherPrice) : "",
    );
    setAbout(description || "");
  }, [
    deadline,
    brandColor,
    brandColors,
    voucherPrice,
    undergraduateVoucherPrice,
    postgraduateVoucherPrice,
    description,
  ]);

  const blended = useMemo(() => blendBrandColors(colors), [colors]);
  const gradient = useMemo(() => brandGradient(colors), [colors]);

  const updateColorAt = (index: number, value: string) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? value : c)),
    );
  };

  const commitColorAt = (index: number) => {
    setColors((prev) =>
      normalizeBrandColors(
        prev.map((c, i) => (i === index ? normalizeBrandColor(c) : c)),
      ),
    );
  };

  const addColor = (hex?: string) => {
    setColors((prev) => {
      if (prev.length >= MAX_BRAND_COLORS) return prev;
      const next = hex ? normalizeBrandColor(hex) : DEFAULT_NEXT_COLOR(prev);
      return normalizeBrandColors([...prev, next]);
    });
  };

  const removeColor = (index: number) => {
    setColors((prev) => {
      if (prev.length <= 1) return prev;
      return normalizeBrandColors(prev.filter((_, i) => i !== index));
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    onError(null);
    try {
      const parsePrice = (raw: string, label: string): number | null => {
        if (raw.trim() === "") return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error(`${label} must be a non-negative number.`);
        }
        return n;
      };

      const parsedUndergrad = parsePrice(
        undergradPriceValue,
        "Undergraduate voucher price",
      );
      const parsedPostgrad = parsePrice(
        postgradPriceValue,
        "Postgraduate voucher price",
      );

      const nextColors = normalizeBrandColors(colors);
      const res = await adminFetch(`/api/school-portal/${slug}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: deadlineValue || null,
          brandColors: nextColors,
          brandColor: nextColors[0],
          undergraduateVoucherPrice: parsedUndergrad,
          postgraduateVoucherPrice: parsedPostgrad,
          voucherPrice: parsedUndergrad,
          description: about,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      const savedColors = normalizeBrandColors(
        data.school?.brandColors,
        data.school?.brandColor,
      );
      onSaved({
        deadline: data.school?.deadline ?? null,
        brandColor: blendBrandColors(savedColors),
        brandColors: savedColors,
        voucherPrice:
          typeof data.school?.voucherPrice === "number"
            ? data.school.voucherPrice
            : null,
        undergraduateVoucherPrice:
          typeof data.school?.undergraduateVoucherPrice === "number"
            ? data.school.undergraduateVoucherPrice
            : null,
        postgraduateVoucherPrice:
          typeof data.school?.postgraduateVoucherPrice === "number"
            ? data.school.postgraduateVoucherPrice
            : null,
        description: data.school?.description ?? null,
      });
      setMessage("Settings saved. Brand colors and voucher prices are live.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordSaving) return;
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await adminFetch(
        `/api/school-portal/${slug}/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-6">
        <section className="rounded-3xl border border-[var(--school-brand-border)] bg-gradient-to-r from-[var(--school-brand-soft)] via-white to-[var(--school-brand-soft)] px-5 py-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--school-brand)] shadow-sm ring-1 ring-[var(--school-brand-border)]">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-[#050816]">
                School settings
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Set voucher prices, deadline, and brand colors. Multiple colors
                are blended across your portal and applicant pages.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <Ticket className="h-4 w-4 text-[var(--school-brand)]" />
            Voucher prices
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[#374151]">
                Undergraduate (GHS)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={undergradPriceValue}
                onChange={(e) => setUndergradPriceValue(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[#374151]">
                Postgraduate (GHS)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={postgradPriceValue}
                onChange={(e) => setPostgradPriceValue(e.target.value)}
                placeholder="e.g. 150"
                className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Applicants choose Undergraduate or Postgraduate when buying a
            voucher. Each level uses its own price when set.
          </p>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <CalendarClock className="h-4 w-4 text-[var(--school-brand)]" />
            Application deadline
          </h3>
          <label className="block max-w-xs space-y-1.5 text-sm">
            <span className="font-medium text-[#374151]">Deadline date</span>
            <input
              type="date"
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
            />
          </label>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Shown on your public school page. Clear the date to hide the
            deadline.
          </p>
          {deadlineValue && (
            <button
              type="button"
              onClick={() => setDeadlineValue("")}
              className="mt-2 text-xs font-medium text-[#DC2626] hover:underline"
            >
              Clear deadline
            </button>
          )}
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Palette className="h-4 w-4 text-[var(--school-brand)]" />
              Brand colors
            </h3>
            <button
              type="button"
              disabled={colors.length >= MAX_BRAND_COLORS}
              onClick={() => addColor()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--school-brand-border)] bg-[var(--school-brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--school-brand)] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add color
            </button>
          </div>
          <p className="mb-4 text-xs text-[#9CA3AF]">
            Choose up to {MAX_BRAND_COLORS} school colors. They blend into your
            portal theme, buttons, and gradients.
          </p>

          <div className="space-y-3">
            {colors.map((color, index) => (
              <div
                key={`brand-color-${index}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3"
              >
                <span className="text-xs font-medium text-[#6B7280]">
                  Color {index + 1}
                </span>
                <input
                  type="color"
                  value={normalizeBrandColor(color)}
                  onChange={(e) =>
                    updateColorAt(index, normalizeBrandColor(e.target.value))
                  }
                  className="h-11 w-14 cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-1"
                  aria-label={`Brand color ${index + 1}`}
                />
                <input
                  value={color}
                  onChange={(e) => updateColorAt(index, e.target.value)}
                  onBlur={() => commitColorAt(index)}
                  className="w-28 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-xs uppercase outline-none focus:border-[var(--school-brand)]"
                  placeholder="#007AFF"
                />
                {colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColor(index)}
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                    title="Remove color"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Quick presets
            </p>
            <div className="flex flex-wrap gap-2">
              {BRAND_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  title={`Add ${preset}`}
                  onClick={() => {
                    if (colors.includes(preset)) {
                      updateColorAt(0, preset);
                    } else if (colors.length < MAX_BRAND_COLORS) {
                      addColor(preset);
                    } else {
                      updateColorAt(colors.length - 1, preset);
                    }
                  }}
                  className="h-9 w-9 rounded-full border-2 border-white shadow-sm transition hover:scale-105"
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#E5E7EB]">
            <div className="h-16 w-full" style={{ backgroundImage: gradient }} />
            <div className="bg-[#F8FAFC] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Blended preview · {blended}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: blended }}
                >
                  Primary button
                </button>
                <button
                  type="button"
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                  style={{ borderColor: blended, color: blended }}
                >
                  Outline button
                </button>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundImage: gradient }}
                >
                  Gradient chip
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-[#111827]">
            About / description
          </h3>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            placeholder="Shown on your public school page…"
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--school-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover)] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save settings
          </button>
          {message && <p className="text-sm text-[#16A34A]">{message}</p>}
        </div>
      </form>

      <form
        onSubmit={(e) => void changePassword(e)}
        className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--school-brand-soft)] text-[var(--school-brand)]">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">
              Change password
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Reset this school admin account password. Enter your current
              password, then choose a new one (at least 8 characters).
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="school-current-password"
              className="block text-sm font-medium text-[#374151]"
            >
              Current password
            </label>
            <PasswordInput
              id="school-current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm text-[#111827] outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-new-password"
              className="block text-sm font-medium text-[#374151]"
            >
              New password
            </label>
            <PasswordInput
              id="school-new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm text-[#111827] outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-confirm-password"
              className="block text-sm font-medium text-[#374151]"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="school-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 pr-10 text-sm text-[#111827] outline-none focus:border-[var(--school-brand)] focus:ring-2 focus:ring-[var(--school-brand-soft)]"
            />
          </div>

          {passwordError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[#B91C1C]">
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p className="text-sm text-[#16A34A]">{passwordMessage}</p>
          )}

          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--school-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover)] disabled:opacity-60"
          >
            {passwordSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}

function DEFAULT_NEXT_COLOR(existing: string[]): string {
  const unused = BRAND_COLOR_PRESETS.find((p) => !existing.includes(p));
  return unused || normalizeBrandColor(existing[0]);
}
