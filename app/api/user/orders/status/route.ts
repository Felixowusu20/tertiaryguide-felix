import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { verifyPaystackTransaction } from "../../../../../lib/paystack";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const reference = searchParams.get("reference");

        if (!reference) {
            return NextResponse.json(
                { error: "Missing reference" },
                { status: 400 },
            );
        }

        const db = await getDb();
        let payment = await db.collection("checkerPayments").findOne({ reference });
        let type: "checker" | "voucher" = "checker";

        if (!payment) {
            payment = await db.collection("voucherPayments").findOne({ reference });
            type = "voucher";
        }

        if (!payment) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 },
            );
        }

        let isPending = false;
        if (type === "checker") {
            isPending = (payment as any).quantity > ((payment as any).checkers?.length || 0);
        } else {
            isPending = !(payment as any).voucher;
        }

        return NextResponse.json(
            {
                ok: true,
                reference,
                pending: isPending,
                type,
                data: type === "checker" ? (payment as any).checkers || [] : (payment as any).voucher || null,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("[user/orders/status] GET error", error);
        return NextResponse.json(
            { error: "Failed to check status" },
            { status: 500 },
        );
    }
}
