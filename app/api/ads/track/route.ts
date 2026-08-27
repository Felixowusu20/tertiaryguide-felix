import { NextRequest, NextResponse } from "next/server";
import {
  AD_EVENT_KINDS,
  AD_EVENT_TYPES,
  AD_PLACEMENTS,
  recordAdEvent,
  type AdEventKind,
  type AdEventType,
  type AdPlacement,
} from "@/lib/ad-analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind as AdEventKind;
    const type = body.type as AdEventType;
    const placement = body.placement as AdPlacement;
    const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
    const sessionKey =
      typeof body.sessionKey === "string" ? body.sessionKey : "";

    if (!AD_EVENT_KINDS.includes(kind) || !AD_EVENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    if (!AD_PLACEMENTS.includes(placement) || !assetId) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const result = await recordAdEvent({
      kind,
      assetId,
      type,
      placement,
      sessionKey,
    });
    return NextResponse.json({ ok: true, recorded: result.recorded });
  } catch (error) {
    console.error("[ads/track] POST", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
