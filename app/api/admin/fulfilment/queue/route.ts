import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "../../../../../lib/admin-access";
import { getVoucherFulfilmentQueue } from "../../../../../lib/voucher-fulfilment";

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const queue = await getVoucherFulfilmentQueue();
    return NextResponse.json({ ok: true, ...queue }, { status: 200 });
  } catch (error) {
    console.error("[admin/fulfilment/queue] GET error", error);
    return NextResponse.json(
      { error: "Failed to load fulfilment queue" },
      { status: 500 },
    );
  }
}
