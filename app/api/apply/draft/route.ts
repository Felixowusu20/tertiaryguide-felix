import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { findSchoolById } from "../../../../lib/admissions/schools";
import { deadlineToIso, loginWithVoucher } from "../../../../lib/admissions/vouchers";
import { isDeadlineCalendarExpired } from "../../../../lib/deadlines";
import {
  applicationDraftsCollection,
  ensureDraftIndexes,
} from "../../../../lib/admissions/programmes";

export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get("schoolId") || "";
    const voucherCode = req.nextUrl.searchParams.get("voucherCode") || "";
    const serialNumber = req.nextUrl.searchParams.get("serialNumber") || "";
    if (!ObjectId.isValid(schoolId)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const db = await getDb();
    await ensureDraftIndexes(db);

    const filter: Record<string, unknown> = { schoolId: new ObjectId(schoolId) };
    if (voucherCode && serialNumber) {
      filter.voucherCode = voucherCode.trim().toUpperCase();
      filter.serialNumber = serialNumber.trim().toUpperCase();
    } else {
      return NextResponse.json({ ok: true, draft: null });
    }

    const draft = await applicationDraftsCollection(db).findOne(filter);
    return NextResponse.json({
      ok: true,
      draft: draft
        ? {
            formData: draft.formData,
            currentTab: draft.currentTab ?? "personal",
            updatedAt: draft.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("[apply/draft] GET", error);
    return NextResponse.json({ error: "Failed to load draft" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolId = typeof body?.schoolId === "string" ? body.schoolId : "";
    const voucherCode =
      typeof body?.voucherCode === "string" ? body.voucherCode.trim().toUpperCase() : "";
    const serialNumber =
      typeof body?.serialNumber === "string"
        ? body.serialNumber.trim().toUpperCase()
        : "";
    const formData =
      body?.formData && typeof body.formData === "object" ? body.formData : null;
    const currentTab =
      typeof body?.currentTab === "string" ? body.currentTab : "personal";

    if (!ObjectId.isValid(schoolId) || !formData) {
      return NextResponse.json({ error: "Invalid draft payload" }, { status: 400 });
    }

    const db = await getDb();
    const school = await findSchoolById(db, schoolId);
    if (!school?.isPartner) {
      return NextResponse.json({ error: "School not available" }, { status: 404 });
    }
    if (isDeadlineCalendarExpired(deadlineToIso(school.deadline))) {
      return NextResponse.json(
        {
          error:
            "The application deadline for this school has passed. Drafts can no longer be saved.",
        },
        { status: 400 },
      );
    }

    let voucherId: ObjectId | null = null;
    let applicantEmail = "";

    if (school.requiresVoucher !== false) {
      if (!voucherCode || !serialNumber) {
        return NextResponse.json(
          { error: "Voucher credentials required to save draft" },
          { status: 400 },
        );
      }
      const validated = await loginWithVoucher({
        db,
        schoolId,
        voucherCode,
        serialNumber,
      });
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: validated.status });
      }
      voucherId = validated.voucher._id ?? null;
      applicantEmail =
        (formData as { personal?: { email?: string } })?.personal?.email?.toLowerCase() ||
        validated.voucher.purchasedBy ||
        validated.voucher.usedBy ||
        "";
    } else {
      applicantEmail =
        (formData as { personal?: { email?: string } })?.personal?.email?.toLowerCase() ||
        "";
    }

    await ensureDraftIndexes(db);
    const now = new Date();
    const filter =
      voucherCode && serialNumber
        ? {
            schoolId: new ObjectId(schoolId),
            voucherCode,
            serialNumber,
          }
        : {
            schoolId: new ObjectId(schoolId),
            applicantEmail,
          };

    await applicationDraftsCollection(db).updateOne(
      filter,
      {
        $set: {
          schoolId: new ObjectId(schoolId),
          voucherId,
          applicantEmail,
          voucherCode: voucherCode || null,
          serialNumber: serialNumber || null,
          formData,
          currentTab,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, savedAt: now.toISOString() });
  } catch (error) {
    console.error("[apply/draft] POST", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
