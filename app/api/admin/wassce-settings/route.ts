import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { requireStaff } from "../../../../lib/admin-access";
import {
  getWassceSettings,
  upsertWassceSettings,
} from "../../../../lib/wassce-settings";

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const settings = await getWassceSettings(db);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[admin/wassce-settings] GET", error);
    return NextResponse.json(
      { error: "Failed to load WASSCE settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const db = await getDb();
    const settings = await upsertWassceSettings(db, {
      priceGhs: body.priceGhs,
      title: body.title,
      steps: body.steps,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    console.error("[admin/wassce-settings] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
