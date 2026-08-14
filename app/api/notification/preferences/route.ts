import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

interface NotificationPreferences {
  _id?: unknown;
  email: string;
  newsUpdates: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const prefs = db.collection<NotificationPreferences>("notification_preferences");

    const doc = await prefs.findOne({ email: email.toLowerCase() });

    if (!doc) {
      return NextResponse.json({ email, newsUpdates: false }, { status: 200 });
    }

    return NextResponse.json({ email: doc.email, newsUpdates: doc.newsUpdates }, { status: 200 });
  } catch (error) {
    console.error("[notification/preferences] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, newsUpdates } = body as {
      email?: string;
      newsUpdates?: boolean;
    };

    if (!email || typeof newsUpdates !== "boolean") {
      return NextResponse.json(
        { error: "Email and newsUpdates are required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const prefs = db.collection<NotificationPreferences>("notification_preferences");

    await prefs.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          email: email.toLowerCase(),
          newsUpdates,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[notification/preferences] POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
