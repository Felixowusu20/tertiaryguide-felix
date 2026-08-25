"use client";

import React from "react";
import { CheckCheck, Mail, MailOpen, Trash2 } from "lucide-react";
import type { AppNotification } from "@/lib/notifications";

type InboxItem = Pick<
  AppNotification,
  "id" | "title" | "body" | "read" | "createdAt"
>;

type NotificationInboxProps = {
  items: InboxItem[];
  emptyTitle?: string;
  emptyBody?: string;
  onOpen: (item: InboxItem) => void;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllRead: () => void;
  onMarkAllUnread: () => void;
  onClearAll: () => void;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationInbox({
  items,
  emptyTitle = "No notifications yet",
  emptyBody = "Activity about your forms, checkers, and updates will show up here.",
  onOpen,
  onToggleRead,
  onDelete,
  onMarkAllRead,
  onMarkAllUnread,
  onClearAll,
}: NotificationInboxProps) {
  const hasUnread = items.some((n) => !n.read);
  const hasRead = items.some((n) => n.read);
  const hasItems = items.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-2 border-b border-[#F0F0F0] px-5 py-3">
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={!hasUnread}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E0E0E0] px-3 py-1.5 text-[11px] font-medium text-[#1E1E1E] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Read all
        </button>
        <button
          type="button"
          onClick={onMarkAllUnread}
          disabled={!hasRead}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E0E0E0] px-3 py-1.5 text-[11px] font-medium text-[#1E1E1E] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Mail className="h-3.5 w-3.5" />
          Unread all
        </button>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasItems}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-100 px-3 py-1.5 text-[11px] font-medium text-[#E33F3F] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear all
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
        {!hasItems ? (
          <div className="rounded-2xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[#1E1E1E]">{emptyTitle}</p>
            <p className="mt-1 text-xs text-[#555555]">{emptyBody}</p>
          </div>
        ) : (
          items.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border px-4 py-3 ${
                notification.read
                  ? "border-[#F0F0F0] bg-white"
                  : "border-[#BFDBFE] bg-[#F8FBFF]"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(notification)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9E9E9E]">
                    {notification.read ? "Read" : "Unread"}
                  </p>
                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#007AFF]" />
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#1E1E1E]">
                  {notification.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#555555]">
                  {notification.body}
                </p>
                <p className="mt-2 text-[11px] text-[#9E9E9E]">
                  {formatWhen(notification.createdAt)}
                </p>
              </button>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleRead(notification.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E0E0E0] px-3 py-1 text-[11px] font-medium text-[#1E1E1E] hover:bg-[#F5F5F5]"
                >
                  {notification.read ? (
                    <>
                      <Mail className="h-3 w-3" />
                      Mark unread
                    </>
                  ) : (
                    <>
                      <MailOpen className="h-3 w-3" />
                      Mark read
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(notification.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-1 text-[11px] font-medium text-[#E33F3F] hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
