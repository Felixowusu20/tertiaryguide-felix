import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import {
  getCachedAssistanceRequests,
  setCachedAssistanceRequests,
  type CachedAssistanceRequest,
} from "../../../../lib/redis";

interface AssistanceRequestDoc {
  _id?: ObjectId;
  medium: "call" | "sms" | "whatsapp" | "email";
  contact: string;
  requesterEmail?: string | null;
  requesterUsername?: string | null;
  createdAt: Date;
}

export async function GET(_req: NextRequest) {
  try {
    const cached = await getCachedAssistanceRequests();
    if (cached) {
      const requests = cached.map((r) => ({
        ...r,
        requesterEmail: r.requesterEmail ?? null,
        requesterUsername: r.requesterUsername ?? null,
      }));
      return NextResponse.json({ ok: true, requests }, { status: 200 });
    }

    const db = await getDb();
    const collection = db.collection<AssistanceRequestDoc>(
      "assistanceRequests",
    );

    const docs = await collection
      .find({}, { sort: { createdAt: -1 } })
      .limit(200)
      .toArray();

    const requests: CachedAssistanceRequest[] = docs.map((doc) => ({
      id: String(doc._id),
      medium: doc.medium,
      contact: doc.contact,
      requesterEmail: doc.requesterEmail ?? null,
      requesterUsername: doc.requesterUsername ?? null,
      createdAt: doc.createdAt.toISOString(),
    }));

    await setCachedAssistanceRequests(requests);

    return NextResponse.json({ ok: true, requests }, { status: 200 });
  } catch (error) {
    console.error("[admin/assistance] GET error", error);
    return NextResponse.json(
      { error: "Failed to load assistance requests" },
      { status: 500 },
    );
  }
}
