import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { deleteOtpForEmail, getOtpForEmail } from "../../../../lib/redis";

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body as { email?: string; code?: string };

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and OTP code are required" },
        { status: 400 },
      );
    }

    console.log("[verify-otp] Incoming request", { email, code });

    const storedHash = await getOtpForEmail(email);

    if (!storedHash) {
      return NextResponse.json(
        { error: "OTP expired or invalid" },
        { status: 400 },
      );
    }

    const submittedHash = hashOtp(code);

    if (submittedHash !== storedHash) {
      return NextResponse.json(
        { error: "Invalid OTP code" },
        { status: 400 },
      );
    }

    await deleteOtpForEmail(email);

    console.log("[verify-otp] OTP verified and deleted", { email });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[verify-otp] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
