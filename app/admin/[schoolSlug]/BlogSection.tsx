"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  ImageIcon,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { BlogEditor } from "@/components/tiptap-templates/blog-editor";
import { adminFetch } from "@/lib/admin-client";

type SchoolBlogPost = {
  id: string;
  title: string;
  status: "Draft" | "Published" | "Scheduled";
  featuredImageUrl: string | null;
  updatedAt: string;
};

const STATUS_STYLES: Record<SchoolBlogPost["status"], string> = {
  Published: "bg-[#ECFDF3] text-[#166534]",
  Draft: "bg-[#F3F4F6] text-[#4B5563]",
  Scheduled: "bg-[#FEF3C7] text-[#B45309]",
};

function StatusBadge({ status }: { status: SchoolBlogPost["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

type Props = {
  slug: string;
  schoolId: string | null;
  schoolName: string;
  onError: (message: string | null) => void;
};

export function BlogSection({ slug, schoolId, schoolName, onError }: Props) {
  const [posts, setPosts] = useState<SchoolBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [status, setStatus] = useState<"Draft" | "Published" | "Scheduled">(
    "Draft",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        onError(null);
        const res = await adminFetch(`/api/school-portal/${slug}/blog-posts`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load blog posts");
        if (!cancelled) {
          setPosts(Array.isArray(data.posts) ? data.posts : []);
        }
      } catch (e) {
        if (!cancelled) {
          onError(
            e instanceof Error ? e.message : "Could not load blog posts.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, onError]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function closeModal() {
    setTitle("");
    setFeaturedImageUrl("");
    setStatus("Draft");
    setScheduledAt("");
    setContentHtml("");
    setCreateOpen(false);
    setEditingId(null);
    setSaveError(null);
    setUploadError(null);
  }

  async function handleSave() {
    if (!title.trim() || !contentHtml.trim()) {
      setSaveError("Title and content are required.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      const url = editingId
        ? `/api/school-portal/${slug}/blog-posts/${editingId}`
        : `/api/school-portal/${slug}/blog-posts`;
      const method = editingId ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          featuredImageUrl: featuredImageUrl.trim(),
          status,
          scheduledAt: scheduledAt || undefined,
          contentHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Could not save blog post.");
        return;
      }

      if (editingId) {
        setPosts((current) =>
          current.map((p) =>
            p.id === editingId ? (data.post as SchoolBlogPost) : p,
          ),
        );
      } else if (data.post) {
        setPosts((current) => [data.post as SchoolBlogPost, ...current]);
      }

      setToast(editingId ? "Post updated." : "Post created.");
      closeModal();
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(post: SchoolBlogPost) {
    setEditingId(post.id);
    setCreateOpen(true);
    setSaveError(null);
    setTitle(post.title);
    setStatus(post.status);
    setFeaturedImageUrl(post.featuredImageUrl || "");

    try {
      const res = await adminFetch(
        `/api/school-portal/${slug}/blog-posts/${post.id}`,
      );
      const data = await res.json();
      if (res.ok && data.post) {
        setTitle(data.post.title);
        setStatus(data.post.status);
        setFeaturedImageUrl(data.post.featuredImageUrl || "");
        setScheduledAt(
          data.post.scheduledAt
            ? new Date(data.post.scheduledAt).toISOString().slice(0, 16)
            : "",
        );
        setContentHtml(data.post.contentHtml);
      }
    } catch {
      setSaveError("Could not load full post details.");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget || deleting) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await adminFetch(
        `/api/school-portal/${slug}/blog-posts/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete post.");
      }
      setPosts((current) => current.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast("Post deleted.");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Error deleting post.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleUploadImage() {
    setUploadError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please choose an image file first.");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setUploadError(data?.error || "Failed to upload image. Try again.");
        return;
      }
      setFeaturedImageUrl(data.url as string);
    } catch {
      setUploadError("Could not upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  const publishedCount = posts.filter((p) => p.status === "Published").length;
  const publicBlogHref = schoolId
    ? `/blog?schoolId=${schoolId}`
    : "/blog";

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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#007AFF] shadow-sm ring-1 ring-[#DBEAFE]">
                <Newspaper className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-[#007AFF] sm:text-2xl">
                School blog
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
              Publish posts for {schoolName || "your school"}. Applicants see
              them on your school blog. TertiaryGuide admins can feature
              published posts on the homepage and main blog.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-white/90 px-4 py-2 text-xs font-medium text-[#1D4ED8] shadow-sm">
              <FileText className="h-3.5 w-3.5" />
              {loading
                ? "Loading…"
                : `${posts.length} post${posts.length === 1 ? "" : "s"} · ${publishedCount} published`}
            </div>
            <Link
              href={publicBlogHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 py-2 text-xs font-semibold text-[#007AFF] hover:bg-[#EFF6FF]"
            >
              Visit school blog <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                closeModal();
                setCreateOpen(true);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0062CC]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create blog post
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-[#DBEAFE] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[minmax(0,2.6fr)_1fr_1.2fr_6.5rem] items-center border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] sm:px-6">
              <span>Title</span>
              <span>Status</span>
              <span>Last updated</span>
              <span className="text-right">Actions</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#F1F5F9]">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid animate-pulse grid-cols-[minmax(0,2.6fr)_1fr_1.2fr_6.5rem] items-center px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 rounded-lg bg-[#E5E7EB]" />
                      <div className="h-3 w-40 rounded bg-[#E5E7EB]" />
                    </div>
                    <div className="h-5 w-20 rounded-full bg-[#E5E7EB]" />
                    <div className="h-3 w-24 rounded bg-[#E5E7EB]" />
                    <div className="ml-auto h-7 w-16 rounded-full bg-[#E5E7EB]" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Newspaper className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#111827]">
                  No blog posts yet
                </p>
                <p className="max-w-sm text-xs text-[#6B7280]">
                  Create your first post — it will appear when applicants open
                  University Blog on your school page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    setCreateOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#0062CC]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create blog post
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] text-sm text-[#111827]">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="grid grid-cols-[minmax(0,2.6fr)_1fr_1.2fr_6.5rem] items-center px-4 py-3 transition-colors hover:bg-[#F8FBFF] sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-3">
                      {post.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.featuredImageUrl}
                          alt=""
                          className="h-10 w-14 flex-shrink-0 rounded-lg border border-[#F1F5F9] object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#9CA3AF]">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                      <span className="truncate font-medium">{post.title}</span>
                    </div>
                    <div>
                      <StatusBadge status={post.status} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF]" />
                      {new Date(post.updatedAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleEdit(post)}
                        title="Edit post"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DBEAFE] text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(post);
                        }}
                        title="Delete post"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#FECACA] text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {createOpen && (
        <section className="mt-5 rounded-3xl border border-[#DBEAFE] bg-white p-4 text-xs text-[#111827] shadow-sm sm:p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#007AFF]">
                {editingId ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </span>
              <h3 className="text-sm font-semibold text-[#111827]">
                {editingId ? "Edit blog post" : "New blog post"}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeModal}
              title="Close editor"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give the post a clear title"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-xs outline-none placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Featured image
                </label>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-3.5 py-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="text-[11px] text-[#4B5563] file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-[#1D4ED8] file:shadow-sm hover:file:bg-[#EFF6FF]"
                    />
                    <p className="text-[10px] text-[#9CA3AF]">
                      Upload a cover image. JPG, PNG or WEBP.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadImage}
                    disabled={uploadingImage}
                    className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
                  >
                    {uploadingImage ? "Uploading…" : "Upload"}
                  </button>
                </div>
                {uploadError && (
                  <p className="text-[11px] text-[#DC2626]">{uploadError}</p>
                )}
                {featuredImageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImageUrl}
                      alt="Featured preview"
                      className="h-12 w-20 rounded-lg border border-[#F1F5F9] object-cover"
                    />
                    <span className="text-[11px] text-[#6B7280]">
                      Current cover image
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as "Draft" | "Published" | "Scheduled",
                      )
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-xs outline-none focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>

                {status === "Scheduled" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Scheduled time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-xs outline-none focus:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
                    />
                  </div>
                )}
              </div>

              <p className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] px-3.5 py-3 text-[11px] text-[#1D4ED8]">
                This post is linked to <strong>{schoolName || "your school"}</strong>{" "}
                and appears on the public University Blog for applicants.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Content
              </label>
              <div className="rounded-xl border border-[#E5E7EB] bg-white">
                <BlogEditor value={contentHtml} onChange={setContentHtml} />
              </div>
            </div>
          </div>

          {saveError && (
            <p className="mt-3 text-[11px] text-[#DC2626]" role="alert">
              {saveError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0062CC] disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Save post"}
            </button>
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-xs font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => {
              if (!deleting) setDeleteTarget(null);
            }}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-[#FECACA] bg-white p-6 shadow-xl sm:inset-x-auto">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#111827]">
                  Delete this post?
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                  <span className="font-medium text-[#111827]">
                    “{deleteTarget.title}”
                  </span>{" "}
                  will be permanently removed from the school blog.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="mt-3 text-xs text-[#DC2626]" role="alert">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteConfirmed()}
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
