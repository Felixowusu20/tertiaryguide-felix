import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";
import {
  getCachedUserByEmail,
  invalidateAssistanceCache,
} from "../../../lib/redis";

type AssistanceMedium = "call" | "sms" | "whatsapp" | "email";

interface AssistanceRequestDoc {
  _id?: ObjectId;
  medium: AssistanceMedium;
  contact: string;
  requesterEmail?: string | null;
  requesterUsername?: string | null;
  createdAt: Date;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null as unknown as null);

    const medium = (body?.medium ?? "") as AssistanceMedium;
    const contact = typeof body?.contact === "string" ? body.contact.trim() : "";

    if (!medium || !["call", "sms", "whatsapp", "email"].includes(medium)) {
      return NextResponse.json(
        { error: "Invalid medium" },
        { status: 400 },
      );
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Contact is required" },
        { status: 400 },
      );
    }

    const requesterEmailRaw = body?.requesterEmail;
    const requesterEmail =
      typeof requesterEmailRaw === "string"
        ? requesterEmailRaw.trim().toLowerCase()
        : "";
    let requesterUsername: string | null = null;
    let requesterEmailStored: string | null = null;

    const db = await getDb();

    if (requesterEmail) {
      const cached = await getCachedUserByEmail(requesterEmail);
      if (cached) {
        requesterEmailStored = cached.email;
        requesterUsername = cached.username?.trim() || null;
      } else {
        const userDoc = await db
          .collection("users")
          .findOne<{ email?: string; username?: string }>(
            { email: requesterEmail },
            { projection: { email: 1, username: 1 } },
          );
        if (userDoc?.email) {
          requesterEmailStored = userDoc.email;
          requesterUsername = userDoc.username?.trim() || null;
        }
      }
    }

    const collection = db.collection<AssistanceRequestDoc>(
      "assistanceRequests",
    );

    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ medium: 1, createdAt: -1 });

    const now = new Date();

    const result = await collection.insertOne({
      medium,
      contact,
      requesterEmail: requesterEmailStored,
      requesterUsername: requesterUsername,
      createdAt: now,
    });

    await invalidateAssistanceCache();

    return NextResponse.json(
      {
        ok: true,
        request: {
          id: result.insertedId.toString(),
          medium,
          contact,
          requesterEmail: requesterEmailStored,
          requesterUsername: requesterUsername,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[assistance] POST error", error);
    return NextResponse.json(
      { error: "Failed to submit assistance request" },
      { status: 500 },
    );
  }
}
