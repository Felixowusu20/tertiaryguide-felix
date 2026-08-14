import crypto from "crypto";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { hashPassword } from "../../../../lib/password";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import { SCHOOL_ADMIN_ROLE } from "../../../../lib/admissions/types";
import {
  cacheUser,
  type CachedUser,
  deletePasswordResetOtpForEmail,
  getPasswordResetOtpForEmail,
} from "../../../../lib/redis";

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

const MIN_PASSWORD = 6;
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
    const pwd =
      typeof newPassword === "string" ? newPassword : "";

    if (!email || !codeTrim || !pwd) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 },
      );
    }

    if (pwd.length < MIN_PASSWORD || pwd.length > MAX_PASSWORD) {
      return NextResponse.json(
        {
          error: `Password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters`,
        },
        { status: 400 },
      );
    }

    const storedHash = await getPasswordResetOtpForEmail(email);
    if (!storedHash) {
      return NextResponse.json(
        { error: "Code expired or invalid. Request a new code." },
        { status: 400 },
      );
    }

    if (hashOtp(codeTrim) !== storedHash) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection<{
      _id: ObjectId;
      email: string;
      username?: string;
      phone?: string;
      passwordHash?: string;
    }>("users");

    const user = await users.findOne({
      email,
      role: { $nin: [...STAFF_ROLES, SCHOOL_ADMIN_ROLE] },
    });
    if (!user?._id) {
      await deletePasswordResetOtpForEmail(email);
      return NextResponse.json(
        { error: "Account not found" },
        { status: 400 },
      );
    }

    const newHash = await hashPassword(pwd);
    const up = await users.updateOne(
      { _id: user._id },
      { $set: { passwordHash: newHash, updatedAt: new Date() } },
    );
    if (up.matchedCount === 0) {
      return NextResponse.json(
        { error: "Could not update password" },
        { status: 500 },
      );
    }

    await deletePasswordResetOtpForEmail(email);

    const cachedUser: CachedUser = {
      id: String(user._id),
      email: user.email,
      username: user.username || "",
      phone: user.phone,
    };
    await cacheUser(cachedUser);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[complete-password-reset] error", error);
    return NextResponse.json(
      { error: "Could not reset password" },
      { status: 500 },
    );
  }
}
