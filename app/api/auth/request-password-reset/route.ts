import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { sendOtpEmail } from "../../../../lib/email";
import { setPasswordResetOtpForEmail } from "../../../../lib/redis";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import { SCHOOL_ADMIN_ROLE } from "../../../../lib/admissions/types";

const OTP_TTL_SECONDS = 10 * 60;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Start forgot-password: if an account with this email exists and has a password,
 * send a 6-digit code (stored under a key separate from signup OTP).
 * Always returns { ok: true } to avoid email enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: raw } = body as { email?: string };
    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection<{
      email: string;
      passwordHash?: string;
    }>("users");

    const user = await users.findOne({
      email,
      role: { $nin: [...STAFF_ROLES, SCHOOL_ADMIN_ROLE] },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const stored = await setPasswordResetOtpForEmail(email, otpHash, OTP_TTL_SECONDS);

    if (!stored) {
      console.error("[request-password-reset] OTP storage failed", { email });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    try {
      await sendOtpEmail({ to: email, code: otp, purpose: "password_reset" });
    } catch (emailError) {
      console.error("[request-password-reset] email send failed", emailError);
      if (process.env.NODE_ENV === "development") {
        console.log("[request-password-reset] Dev OTP", { email, otp });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[request-password-reset] error", error);
    return NextResponse.json(
      { error: "Could not start password reset" },
      { status: 500 },
    );
  }
}
