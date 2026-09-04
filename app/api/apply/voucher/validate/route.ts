import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { findSchoolById } from "../../../../../lib/admissions/schools";
import {
  loginWithVoucher,
  serializeVoucherSession,
} from "../../../../../lib/admissions/vouchers";

/**
 * Student voucher login — same credentials work after logout.
 * Returns existing application when one exists for this voucher.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolId = typeof body?.schoolId === "string" ? body.schoolId : "";
    const voucherCode = typeof body?.voucherCode === "string" ? body.voucherCode : "";
    const serialNumber = typeof body?.serialNumber === "string" ? body.serialNumber : "";

    const db = await getDb();
    const school = await findSchoolById(db, schoolId);
    if (!school || !school.isPartner || school.isActive === false) {
      return NextResponse.json({ error: "School not available" }, { status: 404 });
    }

    const result = await loginWithVoucher({
      db,
      schoolId,
      voucherCode,
      serialNumber,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      ...serializeVoucherSession({
        voucher: result.voucher,
        application: result.application,
        school: {
          id: String(school._id),
          name: school.name,
          slug: school.slug ?? null,
          brandColor: school.brandColor ?? null,
          deadline: school.deadline ?? null,
        },
      }),
    });
  } catch (error) {
    console.error("[apply/voucher/validate]", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
