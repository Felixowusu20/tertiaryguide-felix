import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setOtpForEmail } from "../../../../lib/redis";
import { sendOtpEmail } from "../../../../lib/email";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const stored = await setOtpForEmail(email, otpHash, OTP_TTL_SECONDS);

    if (!stored) {
      return NextResponse.json(
        { error: "Could not store verification code. Please try again." },
        { status: 503 },
      );
    }

    let emailSent = true;
    try {
      await sendOtpEmail({ to: email, code: otp });
    } catch (emailError) {
      emailSent = false;
      console.error("[request-otp] email send failed", emailError);

      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          {
            error:
              "Could not send verification email. Check your email address or try again later.",
          },
          { status: 502 },
        );
      }
    }

    const payload: {
      ok: true;
      emailSent: boolean;
      otp?: string;
      devMessage?: string;
    } = { ok: true, emailSent };

    if (process.env.NODE_ENV === "development") {
      payload.otp = otp;
      if (!emailSent) {
        payload.devMessage =
          "Email could not be sent (check Resend domain). Use the OTP from this response or the server console.";
        console.log("[request-otp] Dev OTP", { email, otp });
      }
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("[request-otp] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
