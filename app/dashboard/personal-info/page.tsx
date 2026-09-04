"use client";

import React, { useEffect, useState } from "react";

type PersonalInfo = {
  username: string;
  email: string;
  phone?: string;
};

export default function PersonalInfoPage() {
  const [info, setInfo] = useState<PersonalInfo | null>(null);
  /* eslint-disable @next/next/no-img-element */
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState("/hero/avatar.png"); // Default
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedEmail =
      typeof window !== "undefined"
        ? window.localStorage.getItem("tg_user_email")
        : null;

    if (!storedEmail) {
      setLoading(false);
      return;
    }

    // Try to load cached avatar
    if (typeof window !== "undefined") {
      const cachedAvatar = window.localStorage.getItem("tg_user_avatar");
      if (cachedAvatar) setAvatar(cachedAvatar);
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/user/me?email=${encodeURIComponent(storedEmail)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data?.user) {
          setInfo({
            username: data.user.username ?? "",
            email: data.user.email ?? storedEmail,
            phone: data.user.phone ?? "",
          });
          if (data.user.profilePicture) {
            setAvatar(data.user.profilePicture);
            window.localStorage.setItem("tg_user_avatar", data.user.profilePicture);
          }
        }
      } catch {
        // ignore fetch errors for now
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const email = window.localStorage.getItem("tg_user_email");
        if (!email) return;

        const res = await fetch("/api/user/profile-picture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, image: base64 }),
        });

        if (res.ok) {
          setAvatar(base64);
          window.localStorage.setItem("tg_user_avatar", base64);
          // Dispatch event for other components
          window.dispatchEvent(new Event("tg-profile-updated"));
        } else {
          alert("Failed to update profile picture");
        }
      } catch (error) {
        console.error(error);
        alert("Error uploading image");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    try {
      const email = window.localStorage.getItem("tg_user_email");
      if (!email) return;

      const res = await fetch("/api/user/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username: info.username,
          phone: info.phone
        }),
      });

      if (res.ok) {
        window.localStorage.setItem("tg_user_name", info.username);
        // Dispatch event for sidebar/header
        window.dispatchEvent(new Event("tg_user_name_updated"));
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const usernameValue = loading ? "" : info?.username ?? "";
  const emailValue = loading ? "" : info?.email ?? "";
  const phoneValue = loading ? "" : info?.phone ?? "";

  return (
    <>
      <div className="mb-8 flex items-center gap-6">
        <div className="relative group">
          {loading && avatar === "/hero/avatar.png" ? (
            <div className="h-24 w-24 animate-pulse rounded-full bg-gray-200" />
          ) : (
            <>
              <div
                className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-100 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-xs font-medium text-white">Edit</span>
              </div>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/50"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>}
        </div>
        <div>
          {loading && !info?.username ? (
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold leading-tight">{info?.username || "User"}</h1>
              <p className="text-sm text-[#555555]">
                {info?.email}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold leading-tight">Profile</h2>
        <p className="text-sm text-[#555555]">
          Modify your username, phone number, and email
        </p>
      </div>

      <div className="space-y-6 md:max-w-xl">
        {/* Username */}
        <div>
          <label className="mb-1 block text-sm text-gray-600">Username</label>
          <input
            type="text"
            value={usernameValue}
            onChange={(event) =>
              setInfo((prev) => ({
                username: event.target.value,
                email: prev?.email ?? "",
                phone: prev?.phone ?? "",
              }))
            }
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3
                    focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="mb-1 block text-sm text-gray-600">Phone Number</label>
          <input
            type="text"
            value={phoneValue}
            onChange={(event) =>
              setInfo((prev) => ({
                username: prev?.username ?? "",
                email: prev?.email ?? "",
                phone: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3
                    focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-sm text-gray-600">Email</label>
          <input
            type="email"
            value={emailValue}
            onChange={(event) =>
              setInfo((prev) => ({
                username: prev?.username ?? "",
                email: event.target.value,
                phone: prev?.phone ?? "",
              }))
            }
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3
                    focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full rounded-xl bg-[#007AFF] px-6 py-3 font-semibold text-white shadow-sm transition
                     hover:bg-[#0062CC] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
