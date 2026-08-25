"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationInbox } from "@/app/components/NotificationInbox";
import {
  readUserNotifications,
  resolveNotificationHref,
  writeUserNotifications,
  type AppNotification,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [newsUpdates, setNewsUpdates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshInbox = useCallback((userEmail: string) => {
    setItems(readUserNotifications(userEmail));
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const storedEmail = window.localStorage.getItem("tg_user_email");
      setEmail(storedEmail);

      if (!storedEmail) {
        setLoading(false);
        return;
      }

      refreshInbox(storedEmail);

      const onUpdated = () => refreshInbox(storedEmail);
      window.addEventListener("tg-notifications-updated", onUpdated);
      window.addEventListener("storage", onUpdated);

      const fetchPrefs = async () => {
        try {
          const res = await fetch(
            `/api/notification/preferences?email=${encodeURIComponent(storedEmail)}`,
          );
          const data = await res.json();
          if (res.ok) {
            setNewsUpdates(Boolean(data.newsUpdates));
          } else {
            console.error("[notifications] Failed to load prefs", data);
          }
        } catch (err) {
          console.error("[notifications] Error loading prefs", err);
        } finally {
          setLoading(false);
        }
      };

      void fetchPrefs();

      return () => {
        window.removeEventListener("tg-notifications-updated", onUpdated);
        window.removeEventListener("storage", onUpdated);
      };
    } catch (err) {
      console.error("[notifications] Error initializing", err);
      setLoading(false);
    }
  }, [refreshInbox]);

  const persist = (updater: (current: AppNotification[]) => AppNotification[]) => {
    if (!email) return;
    const next = updater(items);
    setItems(next);
    writeUserNotifications(email, next);
  };

  const handleSave = async () => {
    if (!email || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/notification/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newsUpdates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save preferences.");
        return;
      }

      setToast("Notification preferences updated.");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("[notifications] Save error", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-semibold leading-tight">Notifications</h1>
        <p className="text-sm text-[#555555]">
          Open an item to go to the related page. Mark unread, read all, or clear
          the list.
        </p>
      </div>

      <div className="-mx-4 flex h-[min(32rem,70vh)] flex-col overflow-hidden rounded-2xl border border-[#E8EEF5] sm:mx-0">
        {loading && !email ? (
          <p className="px-4 py-6 text-sm text-[#6B7280]">Loading notifications…</p>
        ) : email ? (
          <NotificationInbox
            items={items}
            onOpen={(item) => {
              persist((current) =>
                current.map((n) =>
                  n.id === item.id ? { ...n, read: true } : n,
                ),
              );
              router.push(resolveNotificationHref(item as AppNotification));
            }}
            onToggleRead={(id) =>
              persist((current) =>
                current.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
              )
            }
            onDelete={(id) =>
              persist((current) => current.filter((n) => n.id !== id))
            }
            onMarkAllRead={() =>
              persist((current) => current.map((n) => ({ ...n, read: true })))
            }
            onMarkAllUnread={() =>
              persist((current) => current.map((n) => ({ ...n, read: false })))
            }
            onClearAll={() => {
              if (items.length === 0) return;
              if (!window.confirm("Clear all notifications?")) return;
              persist(() => []);
            }}
          />
        ) : (
          <p className="px-4 py-6 text-sm text-[#6B7280]">
            Sign in to see your notifications.
          </p>
        )}
      </div>

      <div className="space-y-6 border-t border-[#F0F0F0] pt-6 md:max-w-xl">
        <div>
          <h2 className="text-lg font-semibold text-[#1E1E1E]">Preferences</h2>
          <p className="mt-1 text-sm text-[#555555]">
            Choose what notifications you receive
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="news-updates"
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-600"
            checked={newsUpdates}
            disabled={loading || !email}
            onChange={(event) => setNewsUpdates(event.target.checked)}
          />
          <label htmlFor="news-updates" className="text-gray-700">
            Get news, announcements, and product updates
          </label>
        </div>

        {error && <p className="text-sm text-[#E33F3F]">{error}</p>}

        <div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !email}
            className="rounded-full bg-[#007AFF] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:bg-[#9EC8FF]"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {!email && (
            <p className="mt-2 text-xs text-[#9E9E9E]">
              Sign in to manage your notification preferences.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
