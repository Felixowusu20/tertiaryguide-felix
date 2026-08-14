import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import { hashAdminOtp } from "../../../../lib/admin-otp";
import { getDb } from "../../../../lib/mongodb";
import {
  deleteAdminEmailRecoveryOtpForUsername,
  getAdminEmailRecoveryOtpForUsername,
} from "../../../../lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username: rawUsername, code, newEmail: rawNewEmail } = body as {
      username?: string;
      code?: string;
      newEmail?: string;
    };

    const username =
      typeof rawUsername === "string" ? rawUsername.trim() : "";
    const codeTrim = typeof code === "string" ? code.trim() : "";
    const newEmail =
      typeof rawNewEmail === "string" ? rawNewEmail.trim().toLowerCase() : "";

    if (!username || !codeTrim) {
      return NextResponse.json(
        { error: "Username and verification code are required" },
        { status: 400 },
      );
    }

    if (newEmail && !newEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid new email is required" },
        { status: 400 },
      );
    }

    const storedHash = await getAdminEmailRecoveryOtpForUsername(username);
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
      username: string;
      email: string;
      role?: string;
    }>("users");

    const staff = await users.findOne({
      username,
      role: { $in: [...STAFF_ROLES] },
    });

    if (!staff?._id) {
      await deleteAdminEmailRecoveryOtpForUsername(username);
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 400 },
      );
    }

    if (newEmail) {
      const existing = await users.findOne({
        email: newEmail,
        _id: { $ne: staff._id },
      });

      if (existing) {
        return NextResponse.json(
          { error: "That email is already in use" },
          { status: 400 },
        );
      }

      await users.updateOne(
        { _id: staff._id },
        { $set: { email: newEmail, updatedAt: new Date() } },
      );

      await deleteAdminEmailRecoveryOtpForUsername(username);

      return NextResponse.json(
        { ok: true, email: newEmail, updated: true },
        { status: 200 },
      );
    }

    await deleteAdminEmailRecoveryOtpForUsername(username);

    return NextResponse.json(
      { ok: true, email: staff.email, updated: false },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/complete-email-recovery] error", error);
    return NextResponse.json(
      { error: "Could not recover email" },
      { status: 500 },
    );
  }
}
