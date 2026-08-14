import { NextRequest, NextResponse } from "next/server";
import { findStaffByUsername } from "../../../../lib/admin-access";
import {
  ADMIN_OTP_TTL_SECONDS,
  generateAdminOtp,
  hashAdminOtp,
  maskEmail,
} from "../../../../lib/admin-otp";
import { sendOtpEmail } from "../../../../lib/email";
import { setAdminEmailRecoveryOtpForUsername } from "../../../../lib/redis";

/**
 * Start admin email recovery. Sends OTP to the email on file for the username.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username: rawUsername } = body as { username?: string };
    const username =
      typeof rawUsername === "string" ? rawUsername.trim() : "";

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const staff = await findStaffByUsername(username);

    if (!staff?.email) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const otp = generateAdminOtp();
    const otpHash = hashAdminOtp(otp);
    const stored = await setAdminEmailRecoveryOtpForUsername(
      username,
      otpHash,
      ADMIN_OTP_TTL_SECONDS,
    );

    if (!stored) {
      console.error("[admin/request-email-recovery] OTP storage failed", {
        username,
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
      console.error("[admin/request-email-recovery] email send failed", emailError);
      if (process.env.NODE_ENV === "development") {
        console.log("[admin/request-email-recovery] Dev OTP", {
          username,
          email: staff.email,
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
    console.error("[admin/request-email-recovery] error", error);
    return NextResponse.json(
      { error: "Could not start email recovery" },
      { status: 500 },
    );
  }
}
