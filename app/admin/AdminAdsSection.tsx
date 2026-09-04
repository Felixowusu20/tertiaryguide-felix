"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, Video } from "lucide-react";
import {
  extractYouTubeVideoId,
  isHttpUrl,
  resolveStoredAdImageUrl,
  youtubePreviewEmbedUrl,
} from "@/lib/adVideo";

type SerializedAd = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string | null;
  targetUrl: string | null;
  ctaText: string;
  advertiserName?: string;
  advertiserEmail?: string;
  campaignName?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  title: "",
  description: "",
  imageUrl: "",
  videoUrl: "",
  ctaText: "Learn more",
  targetUrl: "",
  advertiserName: "",
  advertiserEmail: "",
  campaignName: "",
  isActive: true,
  startDate: "",
  endDate: "",
};

/**
 * Client → `/api/admin/upload-logo` (then server → Cloudinary). Progress reflects bytes sent to our API.
 */
function uploadImageWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && e.total > 0) {
        const raw = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(99, raw));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            url?: string;
            error?: string;
          };
          if (data.url) {
            onProgress(100);
            resolve(data.url);
            return;
          }
          reject(new Error(data.error || "No image URL in response"));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        let message = "Upload failed";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });
    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open("POST", "/api/admin/upload-logo");
    xhr.send(formData);
  });
}

function uploadAdVideoWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && e.total > 0) {
        const raw = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(99, raw));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            url?: string;
            error?: string;
          };
          if (data.url) {
            onProgress(100);
            resolve(data.url);
            return;
          }
          reject(new Error(data.error || "No video URL in response"));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        let message = "Upload failed";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });
    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open("POST", "/api/admin/upload-ad-video");
    xhr.send(formData);
  });
}

export function AdminAdsSection() {
  const [ads, setAds] = useState<SerializedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [localVideoObjectUrl, setLocalVideoObjectUrl] = useState<string | null>(
    null,
  );
  const adVideoInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/ads");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load ads");
      }
      setAds(Array.isArray(data.ads) ? data.ads : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (localVideoObjectUrl) {
        URL.revokeObjectURL(localVideoObjectUrl);
      }
    };
  }, [localVideoObjectUrl]);

  function openCreate() {
    setEditingId(null);
    setFormError(null);
    setImageUploadError(null);
    setImageUploadProgress(0);
    setImageUploading(false);
    setVideoUploadError(null);
    setVideoUploadProgress(0);
    setVideoUploading(false);
    if (localVideoObjectUrl) {
      URL.revokeObjectURL(localVideoObjectUrl);
    }
    setLocalVideoObjectUrl(null);
    if (adImageInputRef.current) adImageInputRef.current.value = "";
    if (adVideoInputRef.current) adVideoInputRef.current.value = "";
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    setForm({
      ...emptyForm,
      startDate: toDatetimeLocalValue(start.toISOString()),
      endDate: toDatetimeLocalValue(end.toISOString()),
    });
    setFormOpen(true);
  }

  function openEdit(ad: SerializedAd) {
    setEditingId(ad.id);
    setFormError(null);
    setImageUploadError(null);
    setImageUploadProgress(0);
    setImageUploading(false);
    setVideoUploadError(null);
    setVideoUploadProgress(0);
    setVideoUploading(false);
    if (localVideoObjectUrl) {
      URL.revokeObjectURL(localVideoObjectUrl);
    }
    setLocalVideoObjectUrl(null);
    if (adImageInputRef.current) adImageInputRef.current.value = "";
    if (adVideoInputRef.current) adVideoInputRef.current.value = "";
    setForm({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      videoUrl: ad.videoUrl ?? "",
      ctaText: ad.ctaText,
      targetUrl: ad.targetUrl ?? "",
      advertiserName: ad.advertiserName ?? "",
      advertiserEmail: ad.advertiserEmail ?? "",
      campaignName: ad.campaignName ?? "",
      isActive: ad.isActive,
      startDate: toDatetimeLocalValue(ad.startDate),
      endDate: toDatetimeLocalValue(ad.endDate),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setImageUploadError(null);
    setImageUploadProgress(0);
    setImageUploading(false);
    setVideoUploadError(null);
    setVideoUploadProgress(0);
    setVideoUploading(false);
    if (localVideoObjectUrl) {
      URL.revokeObjectURL(localVideoObjectUrl);
    }
    setLocalVideoObjectUrl(null);
    if (adImageInputRef.current) adImageInputRef.current.value = "";
    if (adVideoInputRef.current) adVideoInputRef.current.value = "";
  }

  async function handleAdImageSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please choose an image file.");
      return;
    }
    setImageUploadError(null);
    setImageUploading(true);
    setImageUploadProgress(0);
    try {
      const url = await uploadImageWithProgress(file, (pct) => {
        setImageUploadProgress(pct);
      });
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      setImageUploadError(
        e instanceof Error ? e.message : "Upload failed. Try again.",
      );
      setImageUploadProgress(0);
    } finally {
      setImageUploading(false);
    }
    event.target.value = "";
  }

  const previewYoutubeId = useMemo(
    () => extractYouTubeVideoId(form.videoUrl),
    [form.videoUrl],
  );

  const resolvedPosterUrl = useMemo(
    () => resolveStoredAdImageUrl(form.imageUrl, form.videoUrl),
    [form.imageUrl, form.videoUrl],
  );

  async function handleAdVideoSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setVideoUploadError("Please choose a video file (MP4, WebM, etc.).");
      return;
    }
    setVideoUploadError(null);
    if (localVideoObjectUrl) {
      URL.revokeObjectURL(localVideoObjectUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setLocalVideoObjectUrl(blobUrl);
    setVideoUploading(true);
    setVideoUploadProgress(0);
    try {
      const url = await uploadAdVideoWithProgress(file, (pct) => {
        setVideoUploadProgress(pct);
      });
      setForm((f) => ({ ...f, videoUrl: url }));
      setLocalVideoObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setVideoUploadError(
        e instanceof Error ? e.message : "Upload failed. Try again.",
      );
      setVideoUploadProgress(0);
      setLocalVideoObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setVideoUploading(false);
    }
    event.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imageUploading || videoUploading) return;
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.imageUrl.trim() && !form.videoUrl.trim()) {
      setFormError("Add a poster image, or a video (upload or URL).");
      return;
    }
    const storedImageUrl = resolveStoredAdImageUrl(
      form.imageUrl,
      form.videoUrl,
    );
    if (!storedImageUrl) {
      setFormError("Could not determine ad image. Add an image or video URL.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError("Start and end date/time are required.");
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setFormError("Invalid dates.");
      return;
    }
    if (end < start) {
      setFormError("End must be on or after start.");
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: storedImageUrl,
      videoUrl: form.videoUrl.trim() || null,
      ctaText: form.ctaText.trim() || "Learn more",
      targetUrl: form.targetUrl.trim() || null,
      advertiserName: form.advertiserName.trim() || null,
      advertiserEmail: form.advertiserEmail.trim() || null,
      campaignName: form.campaignName.trim() || null,
      isActive: form.isActive,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    try {
      setSaving(true);
      setFormError(null);
      const url = editingId ? `/api/admin/ads/${editingId}` : "/api/admin/ads";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Save failed");
        return;
      }
      closeForm();
      await load();
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this ad? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Delete failed");
        return;
      }
      setAds((prev) => prev.filter((a) => a.id !== id));
    } catch {
      window.alert("Delete failed");
    }
  }

  return (
    <>
      <section className="space-y-1">
        <p className="text-xs font-medium text-[#9CA3AF]">
          Dashboard / <span className="text-[#111827]">Ads</span>
        </p>
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827] md:text-3xl">
            Homepage ads
          </h1>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0062CC] sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            New ad
          </button>
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          Control the rotating promo on the public homepage. Only ads that are
          active and within the schedule window are shown.
        </p>
      </section>

      <section className="mt-5 min-w-0 rounded-2xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <p className="p-4 text-sm text-[#6B7280]">Loading ads…</p>
        ) : error ? (
          <p className="p-4 text-sm text-[#DC2626]">{error}</p>
        ) : ads.length === 0 ? (
          <p className="p-4 text-sm text-[#6B7280]">
            No ads yet. Create one to replace the default homepage carousel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Title</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Active</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Start</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">End</th>
                  <th className="w-24 px-3 py-2.5 text-right font-medium sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {ads.map((ad) => (
                  <tr key={ad.id} className="text-[#111827]">
                    <td className="max-w-[200px] px-3 py-2.5 sm:px-4">
                      <span className="line-clamp-2 font-medium">{ad.title}</span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      {ad.isActive ? (
                        <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[11px] text-[#166534]">
                          On
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[#6B7280]">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#6B7280] sm:px-4">
                      {new Date(ad.startDate).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#6B7280] sm:px-4">
                      {new Date(ad.endDate).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right sm:px-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#4B5563] hover:bg-[#F3F4F6]"
                          aria-label="Edit ad"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(ad.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B91C1C] hover:bg-[#FEF2F2]"
                          aria-label="Delete ad"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={closeForm}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[min(90dvh,800px)] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] sm:inset-y-4 sm:left-1/2 sm:right-auto sm:max-w-lg sm:-translate-x-1/2 sm:rounded-2xl sm:p-5">
            <h2 className="text-sm font-semibold text-[#111827]">
              {editingId ? "Edit ad" : "New ad"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs text-[#111827]">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#4B5563]">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#4B5563]">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Ad image (or use only video — poster auto-fills) *
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={adImageInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="ad-image-upload"
                      onChange={handleAdImageSelected}
                      disabled={imageUploading}
                    />
                    <label
                      htmlFor="ad-image-upload"
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium text-[#111827] hover:bg-[#F3F4F6] ${
                        imageUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {imageUploading ? "Uploading…" : "Upload image"}
                    </label>
                    {form.imageUrl && !imageUploading && (
                      <span className="text-[10px] text-[#6B7280]">
                        URL filled below
                      </span>
                    )}
                  </div>
                </div>
                {imageUploading && (
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className="h-full rounded-full bg-[#007AFF] transition-[width] duration-150 ease-out"
                        style={{ width: `${imageUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280]">
                      Uploading
                      {imageUploadProgress < 100
                        ? `… ${imageUploadProgress}%`
                        : " — finishing…"}
                    </p>
                  </div>
                )}
                {imageUploadError && (
                  <p className="text-[11px] text-[#DC2626]">{imageUploadError}</p>
                )}
                <p className="text-[10px] text-[#9CA3AF]">
                  Uses the same Cloudinary connection as other admin images. You can
                  still paste a public URL if you prefer. If you skip the image and
                  only set a YouTube link below, we save the video thumbnail; for a
                  direct video URL we use a default site image as the stored poster.
                </p>
                <div className="space-y-1">
                  <label
                    className="text-[11px] font-medium text-[#4B5563]"
                    htmlFor="ad-image-url"
                  >
                    Image URL (optional if video is set; auto-filled after upload)
                  </label>
                  <input
                    id="ad-image-url"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono text-[11px] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    placeholder="https://… (filled after upload, or leave empty with video)"
                  />
                </div>
                {resolvedPosterUrl && (form.imageUrl || form.videoUrl) && (
                  <div className="mt-1 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2">
                    <p className="mb-1 text-[10px] text-[#6B7280]">
                      {!form.imageUrl.trim() && form.videoUrl.trim()
                        ? "Saved poster (auto)"
                        : "Poster preview"}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedPosterUrl}
                      alt="Ad poster"
                      className="mx-auto max-h-32 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Video (optional; can be the only media — image is then the
                    poster or auto)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={adVideoInputRef}
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      id="ad-video-upload"
                      onChange={handleAdVideoSelected}
                      disabled={videoUploading}
                    />
                    <label
                      htmlFor="ad-video-upload"
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium text-[#111827] hover:bg-[#F3F4F6] ${
                        videoUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {videoUploading ? "Uploading…" : "Upload video"}
                    </label>
                    {form.videoUrl && !videoUploading && !localVideoObjectUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, videoUrl: "" }));
                        }}
                        className="text-[10px] font-medium text-[#B91C1C] hover:underline"
                      >
                        Clear video
                      </button>
                    )}
                  </div>
                </div>
                {videoUploading && (
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className="h-full rounded-full bg-[#7C3AED] transition-[width] duration-150 ease-out"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280]">
                      Uploading
                      {videoUploadProgress < 100
                        ? `… ${videoUploadProgress}%`
                        : " — finishing…"}
                    </p>
                  </div>
                )}
                {videoUploadError && (
                  <p className="text-[11px] text-[#DC2626]">{videoUploadError}</p>
                )}
                <p className="text-[10px] text-[#9CA3AF]">
                  Upload goes to Cloudinary (same as images). You can also paste a{" "}
                  <strong className="font-medium text-[#6B7280]">YouTube</strong>{" "}
                  link (watch, shorts, or youtu.be) or any public direct video URL
                  — preview updates as you type.
                </p>
                <div className="space-y-1">
                  <label
                    className="text-[11px] font-medium text-[#4B5563]"
                    htmlFor="ad-video-url"
                  >
                    Video URL (filled after upload, or paste YouTube / direct URL)
                  </label>
                  <input
                    id="ad-video-url"
                    value={form.videoUrl}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, videoUrl: e.target.value }));
                    }}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono text-[11px] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    placeholder="https://www.youtube.com/watch?v=… or https://res.cloudinary.com/…/video/…"
                  />
                </div>
                {(localVideoObjectUrl || form.videoUrl.trim()) && (
                  <div className="mt-1 overflow-hidden rounded-lg border border-[#E5E7EB] bg-black p-1">
                    <p className="px-1 pb-1 text-[10px] font-medium text-white/80">
                      Preview
                    </p>
                    {localVideoObjectUrl && (
                      <video
                        key={localVideoObjectUrl}
                        src={localVideoObjectUrl}
                        className="max-h-40 w-full rounded-md object-contain"
                        controls
                        playsInline
                        muted
                        preload="metadata"
                      />
                    )}
                    {!localVideoObjectUrl && previewYoutubeId && (
                      <div className="relative aspect-video w-full">
                        <iframe
                          title="YouTube preview"
                          src={youtubePreviewEmbedUrl(previewYoutubeId)}
                          className="h-full w-full rounded-md"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        />
                      </div>
                    )}
                    {!localVideoObjectUrl &&
                      !previewYoutubeId &&
                      form.videoUrl.trim() &&
                      isHttpUrl(form.videoUrl) && (
                        <video
                          key={form.videoUrl}
                          src={form.videoUrl.trim()}
                          className="max-h-40 w-full rounded-md object-contain"
                          controls
                          playsInline
                          muted
                          preload="metadata"
                        />
                      )}
                    {!localVideoObjectUrl &&
                      !previewYoutubeId &&
                      form.videoUrl.trim() &&
                      !isHttpUrl(form.videoUrl) && (
                        <p className="p-2 text-[10px] text-amber-200">
                          Add a full URL (https://…) to preview, or a YouTube link.
                        </p>
                      )}
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Button label
                  </label>
                  <input
                    value={form.ctaText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ctaText: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Link (href)
                  </label>
                  <input
                    value={form.targetUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, targetUrl: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    placeholder="/university-forms"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Advertiser name
                  </label>
                  <input
                    value={form.advertiserName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, advertiserName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    placeholder="School or brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Advertiser email
                  </label>
                  <input
                    type="email"
                    value={form.advertiserEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, advertiserEmail: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    placeholder="owner@email.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#4B5563]">
                  Campaign name
                </label>
                <input
                  value={form.campaignName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, campaignName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  placeholder="2026 admissions flyer"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#4B5563]">
                    End *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#007AFF] focus:ring-[#007AFF]"
                />
                Active (inactive ads never show on the site)
              </label>
              {formError && (
                <p className="text-[11px] text-[#DC2626]">{formError}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || imageUploading || videoUploading}
                  className="rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0062CC] disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full border border-[#E5E7EB] px-4 py-2 text-xs font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
