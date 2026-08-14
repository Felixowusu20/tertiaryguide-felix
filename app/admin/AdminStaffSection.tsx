"use client";

import React, { useEffect, useState } from "react";
import { Crown, Plus, RefreshCw, Shield, Trash2, UserCog } from "lucide-react";
import { PasswordInput } from "@/app/components/PasswordInput";
import { adminFetch } from "@/lib/admin-client";

type StaffMember = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "superadmin";
  createdAt?: string;
  lastLoginAt?: string;
};

export function AdminStaffSection() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");

  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const currentUsername =
    typeof window !== "undefined"
      ? window.localStorage.getItem("tg_admin_username")
      : null;

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminFetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load staff");
      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = async () => {
    if (creating) return;
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Username, email, and password are required.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const res = await adminFetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff member");

      setUsername("");
      setEmail("");
      setPassword("");
      setRole("admin");
      setShowCreate(false);
      showToast("Staff member created.");
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member.");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetting) return;
    if (resetPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setResetting(true);
      setError(null);
      const res = await adminFetch(`/api/admin/staff/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetTarget(null);
      setResetPassword("");
      showToast(`Password reset for ${resetTarget.username}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.username} from the admin team?`)) return;

    try {
      setError(null);
      const res = await adminFetch(`/api/admin/staff/${member.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff member");
      showToast(`${member.username} removed.`);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove staff member.");
    }
  };

  const roleBadge = (memberRole: StaffMember["role"]) =>
    memberRole === "superadmin" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
        <Crown className="h-3 w-3" />
        Superadmin
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );

  return (
    <>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
          <div className="pointer-events-auto rounded-2xl bg-[#111827] px-4 py-3 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <section className="space-y-1">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Admin team</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827] md:text-3xl">
              Admin team
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Create admins, reset passwords, and manage who can access the panel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStaff()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              <Plus className="h-4 w-4" />
              Add staff
            </button>
          </div>
        </div>
      </section>

      {showCreate && (
        <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#111827]">Create staff account</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">Password</label>
              <PasswordInput
                id="new-staff-password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 pr-10 text-sm focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "superadmin")}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="mt-4 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:bg-[#93C5FD]"
          >
            {creating ? "Creating..." : "Create account"}
          </button>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.2fr_1.6fr_1fr_1fr_1.2fr] bg-[#F9FAFB] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <span>Username</span>
              <span>Email</span>
              <span>Role</span>
              <span>Last login</span>
              <span className="text-right">Actions</span>
            </div>

            {loading ? (
              <div className="px-5 py-6 text-sm text-[#6B7280]">Loading admin team...</div>
            ) : staff.length === 0 ? (
              <div className="px-5 py-6 text-sm text-[#6B7280]">No staff accounts found.</div>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-[1.2fr_1.6fr_1fr_1fr_1.2fr] items-center border-t border-[#F3F4F6] px-5 py-4 text-sm"
                >
                  <span className="font-medium text-[#111827]">{member.username}</span>
                  <span className="text-[#4B5563]">{member.email || "—"}</span>
                  <span>{roleBadge(member.role)}</span>
                  <span className="text-[#6B7280]">
                    {member.lastLoginAt
                      ? new Date(member.lastLoginAt).toLocaleString()
                      : "Never"}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(member);
                        setResetPassword("");
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      Reset
                    </button>
                    {member.username !== currentUsername && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(member)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#FECACA] px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {resetTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setResetTarget(null)}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl sm:inset-x-auto">
            <h3 className="text-base font-semibold text-[#111827]">
              Reset password for {resetTarget.username}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Set a new password for this staff member.
            </p>
            <div className="mt-4">
              <PasswordInput
                id="reset-staff-password"
                value={resetPassword}
                onChange={setResetPassword}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 pr-10 text-sm focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#111827]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#93C5FD]"
              >
                {resetting ? "Saving..." : "Save password"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
