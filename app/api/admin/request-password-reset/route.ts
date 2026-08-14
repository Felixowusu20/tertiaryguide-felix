import { NextRequest, NextResponse } from "next/server";
import {
  findStaffByEmail,
  findStaffByUsername,
} from "../../../../lib/admin-access";
import {
  ADMIN_OTP_TTL_SECONDS,
  generateAdminOtp,
  hashAdminOtp,
  maskEmail,
} from "../../../../lib/admin-otp";
import { sendOtpEmail } from "../../../../lib/email";
import { setAdminPasswordResetOtpForEmail } from "../../../../lib/redis";

async function sendAdminPasswordResetOtp(email: string) {
  const otp = generateAdminOtp();
  const otpHash = hashAdminOtp(otp);
  const stored = await setAdminPasswordResetOtpForEmail(
    email,
    otpHash,
    ADMIN_OTP_TTL_SECONDS,
  );

  if (!stored) {
    console.error("[admin/request-password-reset] OTP storage failed", { email });
    return;
  }

  try {
    await sendOtpEmail({
      to: email,
      code: otp,
      purpose: "admin_password_reset",
    });
  } catch (emailError) {
    console.error("[admin/request-password-reset] email send failed", emailError);
    if (process.env.NODE_ENV === "development") {
      console.log("[admin/request-password-reset] Dev OTP", { email, otp });
    }
  }
}

/**
 * Start admin forgot-password. Accepts email or username.
 * Always returns { ok: true } to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, username: rawUsername } = body as {
      email?: string;
      username?: string;
    };

    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const username =
      typeof rawUsername === "string" ? rawUsername.trim() : "";

    if (!email && !username) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 },
      );
    }

    let staff = null;

    if (email) {
      if (!email.includes("@")) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 },
        );
      }
      staff = await findStaffByEmail(email);
    } else {
      staff = await findStaffByUsername(username);
    }

    if (!staff?.email) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await sendAdminPasswordResetOtp(staff.email);

    return NextResponse.json(
      {
        ok: true,
        maskedEmail: maskEmail(staff.email),
        ...(username && !email ? { email: staff.email } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/request-password-reset] error", error);
    return NextResponse.json(
      { error: "Could not start password reset" },
      { status: 500 },
    );
  }
}
