import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendInstitutionRequestToAdmin } from "@/lib/email";

const MAX = {
  name: 120,
  institution: 200,
  phone: 30,
  message: 2000,
} as const;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      requesterName?: string;
      requesterEmail?: string;
      requesterPhone?: string;
      institutionName?: string;
      message?: string;
      _hp?: string;
    };

    if (body._hp) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const requesterName = (body.requesterName ?? "").trim();
    const institutionName = (body.institutionName ?? "").trim();
    const requesterEmail = (body.requesterEmail ?? "").trim() || null;
    const requesterPhone = (body.requesterPhone ?? "").trim() || null;
    const message = (body.message ?? "").trim() || null;

    if (!requesterName || requesterName.length > MAX.name) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    }
    if (!institutionName || institutionName.length > MAX.institution) {
      return NextResponse.json(
        { error: "Please enter the name of the institution you’re looking for." },
        { status: 400 },
      );
    }
    if (requesterEmail && !isValidEmail(requesterEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address, or leave it empty." },
        { status: 400 },
      );
    }
    if (requesterPhone && requesterPhone.length > MAX.phone) {
      return NextResponse.json(
        { error: "Phone number is too long." },
        { status: 400 },
      );
    }
    if (message && message.length > MAX.message) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const createdAt = new Date();
    await db.collection("institutionFormRequests").insertOne({
      requesterName,
      requesterEmail,
      requesterPhone,
      institutionName,
      message,
      source: "university-forms",
      createdAt,
    });

    try {
      await sendInstitutionRequestToAdmin({
        requesterName,
        requesterEmail,
        requesterPhone,
        institutionName,
        message,
      });
    } catch (mailErr) {
      console.error(
        "[request-institution] email notify failed (record saved)",
        mailErr,
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[request-institution] POST", e);
    return NextResponse.json(
      { error: "Could not send your request. Please try again later." },
      { status: 500 },
    );
  }
}
