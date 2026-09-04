import { NextRequest, NextResponse } from "next/server";
import { CLOUDINARY_EAGER_TRANSFORMS } from "@/lib/cloudinary-image";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
const apiKey = process.env.CLOUDINARY_API_KEY;

if (!cloudName || !uploadPreset) {
  console.warn(
    "CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET must be set for logo uploads.",
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!cloudName || !uploadPreset) {
      console.error("[admin/upload-logo] Missing Cloudinary env", {
        hasCloudName: !!cloudName,
        hasUploadPreset: !!uploadPreset,
      });
      return NextResponse.json(
        { error: "Cloudinary is not configured" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.error("[admin/upload-logo] No valid file in formData", {
        keys: Array.from(formData.keys()),
      });
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const buildUpload = (withEager: boolean) => {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", uploadPreset);
      if (apiKey) {
        uploadData.append("api_key", apiKey);
      }
      if (withEager) {
        uploadData.append("eager", CLOUDINARY_EAGER_TRANSFORMS);
      }
      return uploadData;
    };

    if (!apiKey) {
      console.warn("[admin/upload-logo] CLOUDINARY_API_KEY is not set; relying solely on unsigned preset.");
    }

    let res = await fetch(cloudinaryUrl, {
      method: "POST",
      body: buildUpload(true),
    });
    let data = await res.json();

    if (!res.ok) {
      res = await fetch(cloudinaryUrl, {
        method: "POST",
        body: buildUpload(false),
      });
      data = await res.json();
    }

    if (!res.ok) {
      console.error("[admin/upload-logo] Cloudinary error", {
        status: res.status,
        data,
      });
      return NextResponse.json(
        { error: data.error?.message || "Failed to upload logo" },
        { status: 500 },
      );
    }

    const url = typeof data.secure_url === "string" ? data.secure_url : null;

    if (!url) {
      console.error("[admin/upload-logo] No secure_url in Cloudinary response", {
        data,
      });
      return NextResponse.json(
        { error: "No URL returned from Cloudinary" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url }, { status: 200 });
  } catch (error) {
    console.error("[admin/upload-logo] POST error", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 },
    );
  }
}
