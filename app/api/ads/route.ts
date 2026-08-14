import { NextResponse } from "next/server";
import { getPublicActiveAds } from "@/lib/ads";

/**
 * Public: active ads whose schedule includes "now" (for homepage carousel).
 */
export async function GET() {
  try {
    const ads = await getPublicActiveAds();
    return NextResponse.json({ ok: true, ads });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load ads" },
      { status: 500 },
    );
  }
}
