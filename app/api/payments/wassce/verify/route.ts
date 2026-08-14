import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { verifyPaystackTransaction } from "../../../../../lib/paystack";
import {
  sendWassceCheckerEmail,
  sendWassceCheckerPendingToAdmin,
} from "../../../../../lib/email";
import { invalidateCheckersCache } from "../../../../../lib/redis";

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

    const tx = await verifyPaystackTransaction(reference);

    if (tx.status !== "success") {
      return NextResponse.json(
        {
          error:
            "Payment failed or is incomplete. Your checker was not sent. Please contact support or try again.",
        },
        { status: 400 },
      );
    }

    const email = tx.customer?.email;
    if (!email) {
      return NextResponse.json(
        { error: "No email found on transaction" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection<{
      serial: string;
      pin: string;
      status: "Issued" | "Unissued";
      issuedTo?: string | null;
      issuedAt?: Date | null;
      createdAt?: Date;
    }>("checkers");

    const now = new Date();

    const rawQuantity = (tx.metadata as any)?.quantity;
    const quantity = Math.max(1, Math.min(Number(rawQuantity) || 1, 20));

    const payments = db.collection<{
      reference: string;
      email: string;
      fullName?: string | null;
      amount: number;
      currency: string;
      status: string;
      quantity: number;
      checkers: { serial: string; pin: string }[];
      paidAt: Date;
      createdAt: Date;
    }>("checkerPayments");

    const existingPayment = await payments.findOne({ reference: tx.reference });
    if (existingPayment) {
      // If it exists but is fully issued, return success
      if (existingPayment.checkers?.length >= existingPayment.quantity) {
        return NextResponse.json(
          {
            ok: true,
            email: existingPayment.email,
            quantity: existingPayment.quantity,
            checkers: existingPayment.checkers,
            reference: existingPayment.reference,
          },
          { status: 200 },
        );
      }

      // If it exists but is pending (checkers.length < quantity), we can try to re-process it right now
      // This handles the "Refresh Page" scenario the user mentioned.
      // We fall through to the logic below, BUT we need to be careful not to insert a new payment doc later.
    }

    // If not enough stock, we queue it (pending) instead of erroring
    // Logic: calculate how many we need.
    // If existing payment, need = quantity - existing checks.
    // If new, need = quantity.

    const alreadyIssuedCount = existingPayment?.checkers?.length || 0;
    const needed = quantity - alreadyIssuedCount;

    const availableCount = await collection.countDocuments({ status: "Unissued" });
    const isPending = availableCount < needed;
    const issuedDocs: { serial: string; pin: string }[] = [];

    // Only attempt issue if we can fill SOME or ALL?
    // User requested "Partial Fulfillment".
    // So we iterate up to `needed` or `availableCount`.

    // Actually, earlier logic was "if !isPending" (all or nothing).
    // Now we want "Fill as much as possible".
    // "add it to the already available checker".

    const toIssue = Math.min(needed, 20); // Safety cap

    for (let i = 0; i < toIssue; i++) {
      const result = await collection.findOneAndUpdate(
        { status: "Unissued" },
        {
          $set: {
            status: "Issued",
            issuedTo: email,
            issuedAt: now,
          },
        },
        {
          sort: { createdAt: 1 },
          returnDocument: "after",
        },
      );

      const doc = (result as any)?.value ?? (result as any) ?? null;

      if (!doc || !doc.serial || !doc.pin) {
        break;
      }

      issuedDocs.push({ serial: doc.serial, pin: doc.pin });
    }

    const fullName =
      typeof tx.metadata?.fullName === "string" ? tx.metadata.fullName : undefined;

    if (existingPayment) {
      // Update existing payment
      await payments.updateOne(
        { reference: tx.reference },
        {
          $set: {
            checkers: [...(existingPayment.checkers || []), ...issuedDocs],
            // We might want to update status if now full?
            // But 'status' field from paystack is usually 'success'.
          }
        }
      );

      // Combine old and new for the email
      const allCheckers = [...(existingPayment.checkers || []), ...issuedDocs];
      if (allCheckers.length > 0) {
        await sendWassceCheckerEmail({
          to: email,
          fullName,
          checkers: allCheckers,
        });
        await invalidateCheckersCache();
      }

      const isStillPending = (allCheckers.length < quantity);

      return NextResponse.json(
        {
          ok: true,
          email,
          quantity,
          checkers: allCheckers,
          reference: tx.reference,
          pending: isStillPending,
        },
        { status: 200 },
      );
    }

    await payments.insertOne({
      reference: tx.reference,
      email,
      fullName: fullName ?? null,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      quantity,
      checkers: issuedDocs,
      paidAt: now,
      createdAt: now,
    });

    if (issuedDocs.length < quantity) {
      try {
        await sendWassceCheckerPendingToAdmin({
          buyerEmail: email,
          fullName: fullName ?? null,
          paystackReference: tx.reference,
          amountMinor: tx.amount,
          currency: tx.currency,
          paidAt: now,
          quantity,
          issuedCount: issuedDocs.length,
        });
      } catch (mailErr) {
        console.error(
          "[payments/wassce/verify] admin notify (incomplete issue) failed",
          mailErr,
        );
      }
    }

    if (issuedDocs.length > 0) {
      await sendWassceCheckerEmail({
        to: email,
        fullName,
        checkers: issuedDocs,
      });

      await invalidateCheckersCache();
    }

    return NextResponse.json(
      {
        ok: true,
        email,
        quantity,
        checkers: issuedDocs,
        reference: tx.reference,
        pending: isPending,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[payments/wassce/verify] error", error);
    return NextResponse.json(
      { error: "Could not verify payment" },
      { status: 500 },
    );
  }
}
