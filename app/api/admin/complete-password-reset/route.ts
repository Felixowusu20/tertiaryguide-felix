import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import {
  ADMIN_MIN_PASSWORD,
  hashAdminOtp,
} from "../../../../lib/admin-otp";
import { getDb } from "../../../../lib/mongodb";
import { hashPassword } from "../../../../lib/password";
import {
  deleteAdminPasswordResetOtpForEmail,
  getAdminPasswordResetOtpForEmail,
} from "../../../../lib/redis";

const MAX_PASSWORD = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: raw, code, newPassword } = body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    const codeTrim = typeof code === "string" ? code.trim() : "";
    const pwd = typeof newPassword === "string" ? newPassword : "";

    if (!email || !codeTrim || !pwd) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 },
      );
    }

    if (pwd.length < ADMIN_MIN_PASSWORD || pwd.length > MAX_PASSWORD) {
      return NextResponse.json(
        {
          error: `Password must be between ${ADMIN_MIN_PASSWORD} and ${MAX_PASSWORD} characters`,
        },
        { status: 400 },
      );
    }

    const storedHash = await getAdminPasswordResetOtpForEmail(email);
    if (!storedHash) {
      return NextResponse.json(
        { error: "Code expired or invalid. Request a new code." },
        { status: 400 },
      );
    }

    if (hashAdminOtp(codeTrim) !== storedHash) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection<{
      _id: ObjectId;
      email: string;
      passwordHash?: string;
      role?: string;
    }>("users");

    const staff = await users.findOne({
      email,
      role: { $in: [...STAFF_ROLES] },
    });

    if (!staff?._id) {
      await deleteAdminPasswordResetOtpForEmail(email);
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(pwd);
    const up = await users.updateOne(
      { _id: staff._id },
      { $set: { passwordHash, updatedAt: new Date() } },
    );

    if (up.matchedCount === 0) {
      return NextResponse.json(
        { error: "Could not update password" },
        { status: 500 },
      );
    }

    await deleteAdminPasswordResetOtpForEmail(email);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/complete-password-reset] error", error);
    return NextResponse.json(
      { error: "Could not reset password" },
      { status: 500 },
    );
  }
}
