import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  getWassceSettings,
  renderWassceSteps,
} from "../../../../lib/wassce-settings";

/** Public WASSCE checker page settings (price + steps). */
export async function GET() {
  try {
    const db = await getDb();
    const settings = await getWassceSettings(db);
    return NextResponse.json({
      ok: true,
      settings: {
        ...settings,
        steps: renderWassceSteps(settings.steps, settings.priceGhs),
      },
    });
  } catch (error) {
    console.error("[wassce/settings] GET", error);
    return NextResponse.json(
      { error: "Failed to load WASSCE settings" },
      { status: 500 },
    );
  }
}
