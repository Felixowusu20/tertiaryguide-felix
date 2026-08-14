import { NextRequest, NextResponse } from "next/server";
import { findStaffByEmail } from "../../../../lib/admin-access";
import {
  ADMIN_OTP_TTL_SECONDS,
  generateAdminOtp,
  hashAdminOtp,
  maskEmail,
} from "../../../../lib/admin-otp";
import { sendOtpEmail } from "../../../../lib/email";
import { setAdminUsernameRecoveryOtpForEmail } from "../../../../lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail } = body as { email?: string };
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const staff = await findStaffByEmail(email);

    if (!staff?.username || !staff.email) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const otp = generateAdminOtp();
    const otpHash = hashAdminOtp(otp);
    const stored = await setAdminUsernameRecoveryOtpForEmail(
      email,
      otpHash,
      ADMIN_OTP_TTL_SECONDS,
    );

    if (!stored) {
      console.error("[admin/request-username-recovery] OTP storage failed", {
        email,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    try {
      await sendOtpEmail({
        to: staff.email,
        code: otp,
        purpose: "admin_email_recovery",
      });
    } catch (emailError) {
      console.error(
        "[admin/request-username-recovery] email send failed",
        emailError,
      );
      if (process.env.NODE_ENV === "development") {
        console.log("[admin/request-username-recovery] Dev OTP", {
          email,
          otp,
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        maskedEmail: maskEmail(staff.email),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/request-username-recovery] error", error);
    return NextResponse.json(
      { error: "Could not start username recovery" },
      { status: 500 },
    );
  }
}
