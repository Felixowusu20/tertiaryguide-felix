import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import {
  getCachedCheckers,
  setCachedCheckers,
  invalidateCheckersCache,
  type CachedChecker,
} from "../../../../lib/redis";
import { processPendingWassceOrders } from "../../../../lib/checkers";

type CheckerStatus = "Issued" | "Unissued";

interface CheckerDoc {
  _id?: ObjectId;
  serial: string;
  pin: string;
  status: CheckerStatus;
  issuedTo?: string | null;
  issuedAt?: Date | null;
  createdAt: Date;
}

function sanitize(doc: CheckerDoc): CachedChecker {
  return {
    id: String(doc._id),
    serial: doc.serial,
    pin: doc.pin,
    status: doc.status,
    issuedTo: doc.issuedTo ?? "—",
    issuedAt: doc.issuedAt ? doc.issuedAt.toISOString() : "—",
  };
}

export async function GET(_req: NextRequest) {
  try {
    const cached = await getCachedCheckers();
    if (cached) {
      return NextResponse.json({ ok: true, checkers: cached }, { status: 200 });
    }

    const db = await getDb();
    const collection = db.collection<CheckerDoc>("checkers");

    const docs = await collection
      .find({}, { sort: { createdAt: -1 } })
      .limit(200)
      .toArray();

    const checkers = docs.map(sanitize);

    await setCachedCheckers(checkers);

    return NextResponse.json({ ok: true, checkers }, { status: 200 });
  } catch (error) {
    console.error("[admin/checkers] GET error", error);
    return NextResponse.json(
      { error: "Failed to load checkers" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serial, pin, status } = body as {
      serial?: string;
      pin?: string;
      status?: CheckerStatus;
    };

    if (!serial || !pin || !status) {
      return NextResponse.json(
        { error: "Serial, PIN, and status are required" },
        { status: 400 },
      );
    }

    const trimmedSerial = serial.trim();
    const trimmedPin = pin.trim();

    if (!trimmedSerial || !trimmedPin) {
      return NextResponse.json(
        { error: "Serial and PIN cannot be empty" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection<CheckerDoc>("checkers");

    const now = new Date();
    const insertResult = await collection.insertOne({
      serial: trimmedSerial,
      pin: trimmedPin,
      status,
      issuedTo: null,
      issuedAt: null,
      createdAt: now,
    });

    const created: CheckerDoc = {
      _id: insertResult.insertedId,
      serial: trimmedSerial,
      pin: trimmedPin,
      status,
      issuedTo: null,
      issuedAt: null,
      createdAt: now,
    };

    await invalidateCheckersCache();

    // Trigger processing of any pending orders
    // We don't await this to keep the admin response fast? 
    // Actually, safer to await or fire-and-forget but handle errors inside.
    // Given it sends emails, it might take a second. Let's await to be sure it runs.
    await processPendingWassceOrders();

    return NextResponse.json(
      { ok: true, checker: sanitize(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/checkers] POST error", error);
    return NextResponse.json(
      { error: "Failed to save checker" },
      { status: 500 },
    );
  }
}
