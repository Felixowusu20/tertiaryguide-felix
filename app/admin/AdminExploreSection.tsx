"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Compass,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  EXPLORE_POST_TYPES,
  postTypeLabel,
  type ExploreMedia,
  type ExplorePostType,
} from "@/lib/explore/types";

type ExploreAdminPost = {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  authorType: "admin" | "partner" | "sponsored";
  postType: ExplorePostType;
  body: string;
  media: ExploreMedia[];
  featuredSchool: {
    id: string;
    name: string;
    slug: string | null;
    logoSrc: string | null;
    deadline: string | null;
  } | null;
  isSponsored: boolean;
  status: "Draft" | "Published";
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
};

type SchoolOption = {
  id: string;
  name: string;
  alias: string | null;
  slug: string | null;
  logoSrc: string | null;
  deadline: string | null;
  isPartner?: boolean;
};

export function AdminExploreSection() {
  const [posts, setPosts] = useState<ExploreAdminPost[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [authorName, setAuthorName] = useState("TertiaryGuide");
  const [postType, setPostType] = useState<ExplorePostType>("update");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"Draft" | "Published">("Published");
  const [isSponsored, setIsSponsored] = useState(false);
  const [media, setMedia] = useState<ExploreMedia[]>([]);
  const [featuredSchoolId, setFeaturedSchoolId] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  async function loadPosts() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/explore-posts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load posts");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
    void fetch("/api/schools")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.schools) ? data.schools : [];
        setSchools(
          list.map((s: SchoolOption) => ({
            id: s.id,
            name: s.name,
            alias: s.alias ?? null,
            slug: s.slug ?? null,
            logoSrc: s.logoSrc ?? null,
            deadline: s.deadline ?? null,
            isPartner: s.isPartner,
          })),
        );
      })
      .catch(() => undefined);

    void fetch("/api/apply/schools")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.schools) ? data.schools : [];
        setSchools((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          for (const s of list) {
            map.set(s.id, {
              id: s.id,
              name: s.name,
              alias: s.alias ?? null,
              slug: s.slug ?? null,
              logoSrc: s.logoSrc ?? null,
              deadline: s.deadline ?? null,
              isPartner: true,
            });
          }
          return Array.from(map.values()).sort((a, b) =>
            (a.alias || a.name).localeCompare(b.alias || b.name),
          );
        });
      })
      .catch(() => undefined);
  }, []);

  function resetComposer() {
    setAuthorName("TertiaryGuide");
    setPostType("update");
    setBody("");
    setStatus("Published");
    setIsSponsored(false);
    setMedia([]);
    setFeaturedSchoolId("");
    setSaveError(null);
  }

  async function uploadFile(file: File, kind: "image" | "video") {
    setUploading(true);
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint =
        kind === "video"
          ? "/api/admin/upload-ad-video"
          : "/api/admin/upload-logo";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.url as string;
      setMedia((prev) => [...prev, { type: kind, url }].slice(0, 6));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const school = schools.find((s) => s.id === featuredSchoolId) || null;
      const res = await fetch("/api/admin/explore-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName,
          authorType: isSponsored ? "sponsored" : "admin",
          postType: isSponsored ? "sponsored" : postType,
          body,
          media,
          status,
          isSponsored,
          featuredSchool: school
            ? {
                id: school.id,
                name: school.alias?.trim() || school.name,
                slug: school.slug,
                logoSrc: school.logoSrc,
                deadline: school.deadline,
              }
            : null,
          schoolId: school?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create post");
      setPosts((prev) => [data.post, ...prev]);
      setComposerOpen(false);
      resetComposer();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this explore post?")) return;
    const res = await fetch(`/api/admin/explore-posts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] via-white to-[#F2F8FF] px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#007AFF]/10 text-[#007AFF]">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#050816]">Explore feed</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Share opportunities, flyers, videos, featured schools, and deadline
              announcements on the homepage Explore tab.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetComposer();
            setComposerOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0062CC]"
        >
          <Plus className="h-4 w-4" />
          New post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]">
          <Loader2 className="h-5 w-5 animate-spin text-[#007AFF]" />
          Loading posts…
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-[#111827]">No explore posts yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your first update for the Explore tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">
                      {post.authorName}
                    </p>
                    <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#007AFF]">
                      {postTypeLabel(post.postType)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        post.status === "Published"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">
                    {post.body || "—"}
                  </p>
                  {post.media.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {post.media.map((m, i) =>
                        m.type === "video" ? (
                          <video
                            key={`${post.id}-m-${i}`}
                            src={m.url}
                            className="h-24 w-36 shrink-0 rounded-xl object-cover"
                            muted
                          />
                        ) : (
                          <div
                            key={`${post.id}-m-${i}`}
                            className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                          >
                            <Image
                              src={m.url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        ),
                      )}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-[#9CA3AF]">
                    {post.likeCount} likes · {post.commentCount} comments ·{" "}
                    {post.viewCount} views
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(post.id)}
                  className="rounded-full p-2 text-[#9CA3AF] hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete post"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => setComposerOpen(false)}
          />
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#111827]">
                Create explore post
              </h3>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="rounded-full bg-gray-100 p-2 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#374151]">Author name</span>
                <input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF]"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#374151]">Post type</span>
                <select
                  value={postType}
                  onChange={(e) =>
                    setPostType(e.target.value as ExplorePostType)
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF]"
                >
                  {EXPLORE_POST_TYPES.filter((t) => t !== "sponsored").map(
                    (type) => (
                      <option key={type} value={type}>
                        {postTypeLabel(type)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#374151]">Caption</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Share an opportunity, tip, or announcement…"
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF]"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#374151]">
                  Featured school (optional)
                </span>
                <select
                  value={featuredSchoolId}
                  onChange={(e) => setFeaturedSchoolId(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#007AFF]"
                >
                  <option value="">None</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.alias?.trim() || s.name}
                      {s.deadline
                        ? ` · deadline ${new Date(s.deadline).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#374151]">Media</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={uploading || media.length >= 6}
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Photo / flyer
                  </button>
                  <button
                    type="button"
                    disabled={uploading || media.length >= 6}
                    onClick={() => videoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Video
                  </button>
                  {uploading && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <Upload className="h-3.5 w-3.5 animate-pulse" />
                      Uploading…
                    </span>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file, "image");
                    e.target.value = "";
                  }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file, "video");
                    e.target.value = "";
                  }}
                />
                {media.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {media.map((m, i) => (
                      <div
                        key={`${m.url}-${i}`}
                        className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                      >
                        {m.type === "video" ? (
                          <video
                            src={m.url}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : (
                          <Image
                            src={m.url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setMedia((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSponsored}
                    onChange={(e) => setIsSponsored(e.target.checked)}
                    className="rounded border-gray-300 text-[#007AFF]"
                  />
                  Sponsored / paid post
                </label>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[#6B7280]">Status</span>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "Draft" | "Published")
                    }
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </label>
              </div>

              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}

              <button
                type="submit"
                disabled={saving || uploading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] py-3 text-sm font-semibold text-white hover:bg-[#0062CC] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Publish to Explore"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
