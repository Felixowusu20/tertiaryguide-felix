import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

interface InstitutionFormRequestDoc {
  _id?: ObjectId;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  institutionName: string;
  message: string | null;
  source?: string;
  createdAt: Date;
}

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection<InstitutionFormRequestDoc>(
      "institutionFormRequests",
    );

    const docs = await collection
      .find({}, { sort: { createdAt: -1 } })
      .limit(500)
      .toArray();

    const requests = docs.map((doc) => ({
      id: String(doc._id),
      requesterName: doc.requesterName,
      requesterEmail: doc.requesterEmail ?? null,
      requesterPhone: doc.requesterPhone ?? null,
      institutionName: doc.institutionName,
      message: doc.message ?? null,
      source: doc.source ?? null,
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, requests }, { status: 200 });
  } catch (error) {
    console.error("[admin/form-requests] GET error", error);
    return NextResponse.json(
      { error: "Failed to load form requests" },
      { status: 500 },
    );
  }
}
