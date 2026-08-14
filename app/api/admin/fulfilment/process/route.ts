import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "../../../../../lib/admin-access";
import { processPendingVoucherOrders } from "../../../../../lib/voucher-fulfilment";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const schoolId =
      typeof body?.schoolId === "string" && body.schoolId.trim()
        ? body.schoolId.trim()
        : undefined;

    const result = await processPendingVoucherOrders(
      schoolId ? { schoolId } : undefined,
    );

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[admin/fulfilment/process] POST error", error);
    return NextResponse.json(
      { error: "Failed to process pending voucher orders" },
      { status: 500 },
    );
  }
}
