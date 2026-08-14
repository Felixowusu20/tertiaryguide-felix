import { NextRequest, NextResponse } from "next/server";
import { initializePaystackTransaction } from "../../../../../lib/paystack";
import { getDb } from "../../../../../lib/mongodb";
import { getWassceSettings } from "../../../../../lib/wassce-settings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, quantity } = body as {
      fullName?: string;
      email?: string;
      quantity?: number;
    };

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 },
      );
    }

    const qty = !quantity || quantity < 1 ? 1 : Math.min(quantity, 20);

    const db = await getDb();
    const settings = await getWassceSettings(db);
    const unitPricePesewas = Math.round(settings.priceGhs * 100);
    if (unitPricePesewas <= 0) {
      return NextResponse.json(
        { error: "WASSCE checker price is not configured" },
        { status: 400 },
      );
    }

    const totalAmountPesewas = unitPricePesewas * qty;

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/wassce-checker/success`;

    const tx = await initializePaystackTransaction({
      email,
      amountPesewas: totalAmountPesewas,
      callbackUrl,
      metadata: {
        fullName,
        quantity: qty,
        product: "wassce_checker",
        unitPriceGhs: settings.priceGhs,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        authorizationUrl: tx.authorization_url,
        reference: tx.reference,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[payments/wassce/init] error", error);
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 500 },
    );
  }
}
