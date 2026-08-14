import { NextRequest, NextResponse } from "next/server";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset =
  process.env.CLOUDINARY_VIDEO_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;
const apiKey = process.env.CLOUDINARY_API_KEY;

if (!cloudName || !process.env.CLOUDINARY_UPLOAD_PRESET) {
  console.warn(
    "CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET should be set for admin uploads.",
  );
}

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        { error: "Cloudinary is not configured" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video (e.g. MP4, WebM)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Video is too large (max 200 MB)" },
        { status: 400 },
      );
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", uploadPreset);
    if (apiKey) {
      uploadData.append("api_key", apiKey);
    }

    const res = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadData,
    });

    const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };

    if (!res.ok) {
      console.error("[admin/upload-ad-video] Cloudinary error", {
        status: res.status,
        data,
      });
      return NextResponse.json(
        { error: data.error?.message || "Failed to upload video" },
        { status: 500 },
      );
    }

    const url = typeof data.secure_url === "string" ? data.secure_url : null;

    if (!url) {
      return NextResponse.json(
        { error: "No URL returned from Cloudinary" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url }, { status: 200 });
  } catch (error) {
    console.error("[admin/upload-ad-video] POST error", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 },
    );
  }
}
