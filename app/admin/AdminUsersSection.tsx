"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Trash2, TriangleAlert, Users } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

const AVATAR_COLORS = [
  "bg-[#DBEAFE] text-[#1D4ED8]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#DCFCE7] text-[#15803D]",
  "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#EDE9FE] text-[#6D28D9]",
  "bg-[#CFFAFE] text-[#0E7490]",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(user: AdminUser): string {
  const source = user.username || user.email || "?";
  return source.slice(0, 2).toUpperCase();
}

export function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadUsers = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await adminFetch("/api/admin/users?limit=50");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setError("Could not load users. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone ?? "").toLowerCase().includes(query),
    );
  }, [users, search]);

  const allVisibleSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedUserIds.includes(user.id));

  function toggleUser(id: string) {
    setSelectedUserIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelectedUserIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !filteredUsers.some((user) => user.id === id))
        : [...new Set([...current, ...filteredUsers.map((user) => user.id)])],
    );
  }

  function openConfirm() {
    if (selectedUserIds.length === 0) return;
    setDeleteError(null);
    setConfirmOpen(true);
  }

  async function handleBulkDelete() {
    if (selectedUserIds.length === 0 || deleting) return;

    const ids = [...selectedUserIds];
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await adminFetch("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not delete the selected users.");
      }

      const deletedCount = data.deletedCount ?? ids.length;
      setUsers((current) => current.filter((user) => !ids.includes(user.id)));
      setSelectedUserIds([]);
      setConfirmOpen(false);
      setToast(
        `${deletedCount} user${deletedCount === 1 ? "" : "s"} deleted.`,
      );
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Could not delete the selected users. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const selectedUsers = users.filter((user) =>
    selectedUserIds.includes(user.id),
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

      <section className="space-y-2 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Users</span>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#007AFF] md:text-3xl">
              Users
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              View everyone who has signed up on the platform, pulled directly
              from the live database.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-white/90 px-4 py-2 text-xs font-medium text-[#1D4ED8] shadow-sm">
            <Users className="h-3.5 w-3.5" />
            {loading ? "Loading…" : `${users.length} registered`}
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 rounded-3xl border border-[#DBEAFE] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="w-full rounded-full border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-4 text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {selectedUserIds.length > 0 && (
            <button
              type="button"
              disabled={deleting}
              onClick={openConfirm}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs font-medium text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedUserIds.length} selected
            </button>
          )}
          <button
            type="button"
            disabled={loading || refreshing}
            onClick={() => void loadUsers(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#111827] transition hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </section>

      <section className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-[#DBEAFE] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[2.5rem_1.6fr_2fr_1.2fr_1fr] items-center border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] sm:px-6">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                disabled={loading || deleting || filteredUsers.length === 0}
                onChange={toggleAllVisible}
                aria-label="Select all users"
                className="h-3.5 w-3.5 rounded border-[#9CA3AF] text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span>User</span>
              <span>Email</span>
              <span>Phone</span>
              <span className="text-right">Joined</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#F1F5F9] text-sm">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid animate-pulse grid-cols-[2.5rem_1.6fr_2fr_1.2fr_1fr] items-center px-4 py-4 sm:px-6"
                  >
                    <div className="h-3.5 w-3.5 rounded bg-[#E5E7EB]" />
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#E5E7EB]" />
                      <div className="h-3 w-20 rounded bg-[#E5E7EB]" />
                    </div>
                    <div className="h-3 w-40 rounded bg-[#E5E7EB]" />
                    <div className="h-3 w-24 rounded bg-[#E5E7EB]" />
                    <div className="ml-auto h-3 w-20 rounded bg-[#E5E7EB]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-sm text-[#DC2626]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadUsers()}
                  className="rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-medium text-[#1D4ED8] hover:bg-[#F8FBFF]"
                >
                  Try again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Users className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#111827]">
                  {search ? "No users match your search" : "No users yet"}
                </p>
                <p className="max-w-sm text-xs text-[#6B7280]">
                  {search
                    ? "Try a different name, email, or phone number."
                    : "Once people start signing up, they will appear here instantly."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] text-sm text-[#111827]">
                {filteredUsers.map((user) => {
                  const selected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`grid grid-cols-[2.5rem_1.6fr_2fr_1.2fr_1fr] items-center px-4 py-3.5 transition-colors sm:px-6 ${
                        selected ? "bg-[#EFF6FF]" : "hover:bg-[#F8FBFF]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={deleting}
                        onChange={() => toggleUser(user.id)}
                        aria-label={`Select ${user.username || user.email || "user"}`}
                        className="h-3.5 w-3.5 rounded border-[#9CA3AF] text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(user.id)}`}
                        >
                          {initialsFor(user)}
                        </span>
                        <span className="truncate font-medium">
                          {user.username || "—"}
                        </span>
                      </div>
                      <span className="truncate pr-3 text-[#4B5563]">
                        {user.email || "—"}
                      </span>
                      <span className="text-[#4B5563]">{user.phone || "—"}</span>
                      <span className="text-right text-xs text-[#6B7280]">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {confirmOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => {
              if (!deleting) setConfirmOpen(false);
            }}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-[#FECACA] bg-white p-6 shadow-xl sm:inset-x-auto">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#111827]">
                  Delete {selectedUserIds.length} user
                  {selectedUserIds.length === 1 ? "" : "s"}?
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                  This permanently removes the selected account
                  {selectedUserIds.length === 1 ? "" : "s"} from the platform.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="mt-4 max-h-36 overflow-y-auto rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3">
                <ul className="space-y-1.5 text-xs text-[#4B5563]">
                  {selectedUsers.slice(0, 6).map((user) => (
                    <li key={user.id} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarColor(user.id)}`}
                      >
                        {initialsFor(user)}
                      </span>
                      <span className="truncate font-medium text-[#111827]">
                        {user.username || "—"}
                      </span>
                      <span className="truncate text-[#9CA3AF]">
                        {user.email}
                      </span>
                    </li>
                  ))}
                  {selectedUsers.length > 6 && (
                    <li className="pt-0.5 text-[#9CA3AF]">
                      and {selectedUsers.length - 6} more…
                    </li>
                  )}
                </ul>
              </div>
            )}

            {deleteError && (
              <p className="mt-3 text-xs text-[#DC2626]" role="alert">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleBulkDelete()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
