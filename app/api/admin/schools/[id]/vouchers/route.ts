import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import {
  normalizeProgrammeLevel,
  parseProgrammeLevel,
  PROGRAMME_LEVEL_LABELS,
  type ProgrammeLevel,
} from "../../../../../../lib/admissions/programme-level";

type VoucherStatus = "Unserved" | "Served";

interface VoucherDoc {
  _id?: ObjectId;
  schoolId: ObjectId;
  serial: string;
  pin: string;
  status: VoucherStatus;
  programmeLevel: ProgrammeLevel;
  createdAt: Date;
  issuedTo?: string | null;
  issuedAt?: Date | null;
}

function serializeVoucher(doc: VoucherDoc) {
  return {
    id: String(doc._id),
    serial: doc.serial,
    pin: doc.pin,
    status: doc.status,
    programmeLevel: normalizeProgrammeLevel(doc.programmeLevel),
    programmeLevelLabel:
      PROGRAMME_LEVEL_LABELS[normalizeProgrammeLevel(doc.programmeLevel)],
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: schoolId } = await context.params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const db = await getDb();
    const vouchers = db.collection<VoucherDoc>("schoolVouchers");

    const docs = await vouchers
      .find({ schoolId: new ObjectId(schoolId) }, { sort: { createdAt: -1 } })
      .limit(200)
      .toArray();

    const items = docs.map(serializeVoucher);

    return NextResponse.json({ ok: true, vouchers: items }, { status: 200 });
  } catch (error) {
    console.error("[admin/schools/[id]/vouchers] GET error", error);
    return NextResponse.json(
      { error: "Failed to load vouchers" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: schoolId } = await context.params;
    if (!schoolId || !ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null as unknown as null);
    const serial = typeof body?.serial === "string" ? body.serial.trim() : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const programmeLevel = parseProgrammeLevel(body?.programmeLevel);

    if (!serial) {
      return NextResponse.json(
        { error: "Voucher serial is required" },
        { status: 400 },
      );
    }

    if (!pin) {
      return NextResponse.json(
        { error: "Voucher PIN is required" },
        { status: 400 },
      );
    }

    if (!programmeLevel) {
      return NextResponse.json(
        { error: "Please select Undergraduate or Postgraduate" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const vouchers = db.collection<VoucherDoc>("schoolVouchers");

    await vouchers.createIndex({ schoolId: 1, serial: 1, pin: 1 }, { unique: true });
    await vouchers.createIndex({ schoolId: 1, programmeLevel: 1, status: 1 });

    const now = new Date();

    const schoolObjectId = new ObjectId(schoolId);

    const result = await vouchers.insertOne({
      schoolId: schoolObjectId,
      serial,
      pin,
      status: "Unserved",
      programmeLevel,
      createdAt: now,
    });

    const { processPendingVoucherOrders } = await import(
      "../../../../../../lib/voucher-fulfilment"
    );
    await processPendingVoucherOrders({ schoolId });

    return NextResponse.json(
      {
        ok: true,
        voucher: serializeVoucher({
          _id: result.insertedId,
          schoolId: schoolObjectId,
          serial,
          pin,
          status: "Unserved",
          programmeLevel,
          createdAt: now,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/schools/[id]/vouchers] POST error", error);
    return NextResponse.json(
      { error: "Failed to create voucher" },
      { status: 500 },
    );
  }
}
