import { ObjectId, type Db } from "mongodb";
import type { AdmissionPaymentDoc, AdmissionVoucherDoc, SchoolDoc } from "./types";
import type { ProgrammeLevel } from "./programme-level";
import { generateSerialNumber, generateVoucherCode } from "./voucher-codes";
import { effectiveVoucherPrice } from "./schools";
import {
  applicationsCollection,
  serializeApplication,
} from "./applications";
import { canStudentEditApplication, deadlineToIso } from "./edit-window";
import { isDeadlineCalendarExpired } from "../deadlines";

export function admissionVouchersCollection(db: Db) {
  return db.collection<AdmissionVoucherDoc>("admissionVouchers");
}

export function admissionPaymentsCollection(db: Db) {
  return db.collection<AdmissionPaymentDoc>("admissionPayments");
}

export async function ensureAdmissionVoucherIndexes(db: Db): Promise<void> {
  const vouchers = admissionVouchersCollection(db);
  await vouchers.createIndex({ voucherCode: 1 }, { unique: true });
  await vouchers.createIndex({ serialNumber: 1 }, { unique: true });
  await vouchers.createIndex({ schoolId: 1, isUsed: 1 });
  await vouchers.createIndex({ schoolId: 1, programmeLevel: 1, createdAt: -1 });
  await vouchers.createIndex({ paymentReference: 1 }, { sparse: true });
  await vouchers.createIndex({ purchasedBy: 1, createdAt: -1 });

  const payments = admissionPaymentsCollection(db);
  await payments.createIndex({ reference: 1 }, { unique: true });
  await payments.createIndex({ schoolId: 1, createdAt: -1 });
  await payments.createIndex({ email: 1, createdAt: -1 });
}

async function nextSerialSequence(db: Db): Promise<number> {
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  const year = new Date().getFullYear();
  const result = await counters.findOneAndUpdate(
    { _id: `admission_serial_${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const doc = (result as { value?: { seq: number } } | null)?.value
    ?? (result as { seq?: number } | null);
  return doc?.seq ?? 1;
}

export async function createAdmissionVoucher(opts: {
  db: Db;
  school: SchoolDoc;
  amount: number;
  paymentReference: string;
  buyerEmail: string;
  programmeLevel: ProgrammeLevel;
}): Promise<AdmissionVoucherDoc> {
  const { db, school, amount, paymentReference, buyerEmail, programmeLevel } =
    opts;
  await ensureAdmissionVoucherIndexes(db);

  const vouchers = admissionVouchersCollection(db);
  const prefix = school.slug || school.alias || school.name;
  const seq = await nextSerialSequence(db);
  const serialNumber = generateSerialNumber(seq);

  let voucherCode = generateVoucherCode(prefix);
  for (let i = 0; i < 8; i += 1) {
    try {
      const doc: AdmissionVoucherDoc = {
        schoolId: school._id as ObjectId,
        voucherCode,
        serialNumber,
        amount,
        programmeLevel,
        purchasedBy: buyerEmail.trim().toLowerCase() || null,
        isUsed: false,
        usedBy: null,
        usedAt: null,
        paymentReference,
        status: "active",
        createdAt: new Date(),
      };
      const result = await vouchers.insertOne(doc);
      return { ...doc, _id: result.insertedId };
    } catch (error) {
      const isDup =
        error instanceof Error &&
        (error.message.includes("E11000") || error.message.includes("duplicate"));
      if (!isDup) throw error;
      voucherCode = generateVoucherCode(prefix);
    }
  }

  throw new Error("Could not allocate a unique voucher code");
}

/**
 * Authenticate with voucher credentials.
 * Used vouchers remain valid for re-login so students can check status / edit.
 * Only revoked vouchers are rejected.
 */
export async function validateAdmissionVoucher(opts: {
  db: Db;
  schoolId: string;
  voucherCode: string;
  serialNumber: string;
  /** When true, reject vouchers that already have a submitted application (first-time only). */
  requireUnused?: boolean;
}): Promise<
  | { ok: true; voucher: AdmissionVoucherDoc }
  | { ok: false; error: string; status: number }
> {
  const { db, schoolId, voucherCode, serialNumber, requireUnused = false } = opts;
  if (!ObjectId.isValid(schoolId)) {
    return { ok: false, error: "Invalid school", status: 400 };
  }

  const code = voucherCode.trim().toUpperCase();
  const serial = serialNumber.trim().toUpperCase();
  if (!code || !serial) {
    return { ok: false, error: "Voucher code and serial number are required", status: 400 };
  }

  const voucher = await admissionVouchersCollection(db).findOne({
    schoolId: new ObjectId(schoolId),
    voucherCode: code,
    serialNumber: serial,
  });

  if (!voucher) {
    return { ok: false, error: "Invalid voucher credentials", status: 400 };
  }
  if (voucher.status === "revoked") {
    return { ok: false, error: "This voucher has been revoked", status: 400 };
  }
  if (requireUnused && (voucher.isUsed || voucher.status === "used")) {
    return { ok: false, error: "This voucher has already been used", status: 400 };
  }

  return { ok: true, voucher };
}

export async function findApplicationForVoucher(
  db: Db,
  voucherId: ObjectId,
) {
  return applicationsCollection(db).findOne({ voucherId });
}

export async function loginWithVoucher(opts: {
  db: Db;
  schoolId: string;
  voucherCode: string;
  serialNumber: string;
}) {
  const validated = await validateAdmissionVoucher(opts);
  if (!validated.ok) return validated;

  const application = validated.voucher._id
    ? await findApplicationForVoucher(opts.db, validated.voucher._id)
    : null;

  return {
    ok: true as const,
    voucher: validated.voucher,
    application,
  };
}

/** Mark voucher as linked to a submitted application. Still allows re-login. */
export async function markVoucherUsed(opts: {
  db: Db;
  voucherId: ObjectId;
  usedBy: string;
}): Promise<void> {
  await admissionVouchersCollection(opts.db).updateOne(
    { _id: opts.voucherId },
    {
      $set: {
        isUsed: true,
        usedBy: opts.usedBy,
        usedAt: new Date(),
        status: "used",
      },
    },
  );
}

export {
  canStudentEditApplication,
  deadlineToIso,
  isApplicationEditable,
  EDITABLE_APPLICATION_STATUSES,
} from "./edit-window";

export function serializeVoucherSession(opts: {
  voucher: AdmissionVoucherDoc;
  application: Awaited<ReturnType<typeof findApplicationForVoucher>>;
  school: {
    id: string;
    name: string;
    slug: string | null;
    brandColor?: string | null;
    deadline?: Date | string | null;
  };
}) {
  const { voucher, application, school } = opts;
  const deadline = deadlineToIso(school.deadline);
  return {
    voucher: {
      id: String(voucher._id),
      voucherCode: voucher.voucherCode,
      serialNumber: voucher.serialNumber,
      programmeLevel: voucher.programmeLevel ?? "undergraduate",
      isUsed: !!voucher.isUsed,
      purchasedBy: voucher.purchasedBy ?? null,
    },
    school: {
      id: school.id,
      name: school.name,
      slug: school.slug,
      brandColor: school.brandColor ?? null,
      deadline,
    },
    application: application ? serializeApplication(application) : null,
    canEdit: canStudentEditApplication(application?.status, deadline),
    hasApplication: !!application,
    deadlineExpired: isDeadlineCalendarExpired(deadline),
  };
}

export function resolvePartnerVoucherAmount(
  school: SchoolDoc,
  programmeLevel: ProgrammeLevel = "undergraduate",
): number | null {
  const price = effectiveVoucherPrice(school, programmeLevel);
  if (price === null || price <= 0) return null;
  return price;
}
