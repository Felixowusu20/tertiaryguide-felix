import { NextRequest, NextResponse } from "next/server";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
const apiKey = process.env.CLOUDINARY_API_KEY;

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
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Cap at ~10MB for application documents
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be 10MB or smaller" },
        { status: 400 },
      );
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", uploadPreset);
    uploadData.append("folder", "admissions");
    if (apiKey) uploadData.append("api_key", apiKey);

    const res = await fetch(cloudinaryUrl, { method: "POST", body: uploadData });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Failed to upload file" },
        { status: 500 },
      );
    }

    const url = typeof data.secure_url === "string" ? data.secure_url : null;
    if (!url) {
      return NextResponse.json({ error: "No URL returned from Cloudinary" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("[apply/upload]", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
