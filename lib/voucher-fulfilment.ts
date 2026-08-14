import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { sendFormVoucherEmail } from "./email";
import {
  normalizeProgrammeLevel,
  schoolVoucherLevelFilter,
  type ProgrammeLevel,
} from "./admissions/programme-level";

type VoucherStatus = "Unserved" | "Served";

function schoolDisplayName(school: { name?: string; alias?: string | null } | null) {
  const alias = school?.alias?.replace(/\s+/g, " ").trim();
  if (alias) return alias;
  const name = school?.name?.replace(/\s+/g, " ").trim();
  return name || "Unknown school";
}

export async function processPendingVoucherOrders(options?: { schoolId?: string }) {
  const db = await getDb();
  const vouchers = db.collection<{
    _id?: ObjectId;
    schoolId: ObjectId;
    serial: string;
    pin: string;
    status: VoucherStatus;
    programmeLevel?: ProgrammeLevel | null;
    createdAt: Date;
    issuedTo?: string | null;
    issuedAt?: Date | null;
  }>("schoolVouchers");

  const payments = db.collection<{
    _id?: ObjectId;
    reference: string;
    email: string;
    fullName?: string | null;
    schoolId: ObjectId;
    programmeLevel?: ProgrammeLevel | null;
    voucher: { serial: string; pin: string } | null;
    status: string;
    paidAt: Date;
  }>("voucherPayments");

  const schools = db.collection<{
    _id: ObjectId;
    name: string;
    alias?: string | null;
  }>("schools");

  const filter: Record<string, unknown> = {
    status: "success",
    $or: [{ voucher: null }, { voucher: { $exists: false } }],
  };

  if (options?.schoolId && ObjectId.isValid(options.schoolId)) {
    filter.schoolId = new ObjectId(options.schoolId);
  }

  const pendingOrders = await payments.find(filter).sort({ paidAt: 1 }).toArray();

  let fulfilled = 0;
  const schoolNameCache = new Map<string, string>();

  for (const order of pendingOrders) {
    const programmeLevel = normalizeProgrammeLevel(order.programmeLevel);
    const result = await vouchers.findOneAndUpdate(
      {
        schoolId: order.schoolId,
        status: "Unserved",
        ...schoolVoucherLevelFilter(programmeLevel),
      },
      {
        $set: {
          status: "Served",
          issuedTo: order.email,
          issuedAt: new Date(),
        },
      },
      {
        sort: { createdAt: 1 },
        returnDocument: "after",
      },
    );

    const doc = (result as { value?: { serial: string; pin: string } } | null)?.value
      ?? (result as { serial?: string; pin?: string } | null)
      ?? null;

    if (!doc?.serial || !doc?.pin) {
      continue;
    }

    const voucherPayload = { serial: doc.serial, pin: doc.pin };

    await payments.updateOne(
      { _id: order._id },
      { $set: { voucher: voucherPayload, programmeLevel } },
    );

    const schoolKey = order.schoolId.toHexString();
    if (!schoolNameCache.has(schoolKey)) {
      const schoolDoc = await schools.findOne({ _id: order.schoolId });
      schoolNameCache.set(schoolKey, schoolDisplayName(schoolDoc));
    }

    await sendFormVoucherEmail({
      to: order.email,
      fullName: order.fullName ?? undefined,
      schoolId: schoolKey,
      schoolName: schoolNameCache.get(schoolKey) || "University",
      voucher: voucherPayload,
    });

    fulfilled += 1;
  }

  const stillPending = await payments.countDocuments(filter);

  return {
    found: pendingOrders.length,
    fulfilled,
    stillPending,
  };
}

export async function getVoucherFulfilmentQueue() {
  const db = await getDb();
  const payments = db.collection<{
    _id?: ObjectId;
    reference: string;
    email: string;
    fullName?: string | null;
    schoolId: ObjectId;
    programmeLevel?: ProgrammeLevel | null;
    voucher: { serial: string; pin: string } | null;
    status: string;
    paidAt: Date;
  }>("voucherPayments");

  const vouchers = db.collection<{
    schoolId: ObjectId;
    status: VoucherStatus;
    programmeLevel?: ProgrammeLevel | null;
  }>("schoolVouchers");

  const schools = db.collection<{
    _id: ObjectId;
    name: string;
    alias?: string | null;
  }>("schools");

  const pendingOrders = await payments
    .find({
      status: "success",
      $or: [{ voucher: null }, { voucher: { $exists: false } }],
    })
    .sort({ paidAt: 1 })
    .limit(100)
    .toArray();

  const pendingCount = await payments.countDocuments({
    status: "success",
    $or: [{ voucher: null }, { voucher: { $exists: false } }],
  });

  const stockBySchool = await vouchers
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { status: "Unserved" } },
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
    ])
    .toArray();

  const pendingBySchool = await payments
    .aggregate<{ _id: ObjectId; count: number }>([
      {
        $match: {
          status: "success",
          $or: [{ voucher: null }, { voucher: { $exists: false } }],
        },
      },
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
    ])
    .toArray();

  const stockMap = new Map(
    stockBySchool.map((row) => [row._id.toHexString(), row.count]),
  );

  const readyToFulfill = pendingBySchool.reduce((sum, row) => {
    const stock = stockMap.get(row._id.toHexString()) ?? 0;
    return sum + Math.min(row.count, stock);
  }, 0);

  const schoolIds = [...new Set(pendingOrders.map((p) => p.schoolId.toHexString()))]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const schoolDocs =
    schoolIds.length > 0
      ? await schools.find({ _id: { $in: schoolIds } }).toArray()
      : [];

  const schoolById = new Map(
    schoolDocs.map((school) => [school._id.toHexString(), school]),
  );

  const items = pendingOrders.map((order) => {
    const schoolKey = order.schoolId.toHexString();
    const stock = stockMap.get(schoolKey) ?? 0;
    const programmeLevel = normalizeProgrammeLevel(order.programmeLevel);
    return {
      id: String(order._id),
      reference: order.reference,
      email: order.email,
      fullName: order.fullName ?? null,
      school: schoolDisplayName(schoolById.get(schoolKey) ?? null),
      schoolId: schoolKey,
      programmeLevel,
      paidAt: order.paidAt.toISOString(),
      unservedStock: stock,
      canFulfill: stock > 0,
    };
  });

  const unservedStockTotal = stockBySchool.reduce((sum, row) => sum + row.count, 0);

  return {
    pendingCount,
    readyToFulfill,
    unservedStockTotal,
    items,
  };
}
