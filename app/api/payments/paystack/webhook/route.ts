import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "../../../../../lib/mongodb";
import { fulfilPartnerVoucherPayment } from "../../../../../lib/admissions/fulfil-partner-voucher";

/**
 * Paystack webhook — fires when payment succeeds so the voucher email
 * is sent even if the student never returns to the success page.
 *
 * Configure in Paystack dashboard:
 *   URL: https://your-domain/api/payments/paystack/webhook
 *   Event: charge.success
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
    const valid =
      signature.length === hash.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(hash));

    if (!valid) {
      console.warn("[paystack/webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        customer?: { email?: string };
        metadata?: Record<string, unknown>;
      };
    };

    if (event.event !== "charge.success" || event.data?.status !== "success") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const data = event.data;
    const reference = data.reference?.trim();
    const product = data.metadata?.product;
    const schoolId =
      typeof data.metadata?.schoolId === "string" ? data.metadata.schoolId : null;

    // Only handle partner-school admission vouchers here
    if (product !== "partner_voucher" || !reference || !schoolId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const email = (data.customer?.email || "").toLowerCase();
    const fullName =
      typeof data.metadata?.fullName === "string" ? data.metadata.fullName : undefined;
    const amountGhs = (data.amount || 0) / 100;
    const programmeLevel =
      data.metadata?.programmeLevel === "undergraduate" ||
      data.metadata?.programmeLevel === "postgraduate"
        ? data.metadata.programmeLevel
        : undefined;

    const db = await getDb();
    const result = await fulfilPartnerVoucherPayment({
      db,
      reference,
      schoolId,
      email,
      fullName,
      amountGhs,
      programmeLevel,
    });

    if (!result.ok) {
      console.error("[paystack/webhook] fulfil failed", result);
      // Still 200 so Paystack does not hammer retries forever for bad data
      return NextResponse.json({ ok: false, error: result.error });
    }

    console.log("[paystack/webhook] partner voucher fulfilled", {
      reference,
      emailSent: result.emailSent,
      voucherCode: result.voucher.voucherCode,
    });

    return NextResponse.json({
      ok: true,
      emailSent: result.emailSent,
      voucherCode: result.voucher.voucherCode,
    });
  } catch (error) {
    console.error("[paystack/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
