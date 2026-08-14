import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import { hashAdminOtp, maskUsername } from "../../../../lib/admin-otp";
import { getDb } from "../../../../lib/mongodb";
import {
  deleteAdminUsernameRecoveryOtpForEmail,
  getAdminUsernameRecoveryOtpForEmail,
} from "../../../../lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, code, newUsername: rawNewUsername } = body as {
      email?: string;
      code?: string;
      newUsername?: string;
    };

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const codeTrim = typeof code === "string" ? code.trim() : "";
    const newUsername =
      typeof rawNewUsername === "string" ? rawNewUsername.trim() : "";

    if (!email || !email.includes("@") || !codeTrim) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 },
      );
    }

    if (newUsername && newUsername.length < 3) {
      return NextResponse.json(
        { error: "New username must be at least 3 characters" },
        { status: 400 },
      );
    }

    const storedHash = await getAdminUsernameRecoveryOtpForEmail(email);
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
      email,
      role: { $in: [...STAFF_ROLES] },
    });

    if (!staff?._id) {
      await deleteAdminUsernameRecoveryOtpForEmail(email);
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 400 },
      );
    }

    if (newUsername) {
      const existing = await users.findOne({
        username: newUsername,
        _id: { $ne: staff._id },
      });

      if (existing) {
        return NextResponse.json(
          { error: "That username is already in use" },
          { status: 400 },
        );
      }

      await users.updateOne(
        { _id: staff._id },
        { $set: { username: newUsername, updatedAt: new Date() } },
      );

      await deleteAdminUsernameRecoveryOtpForEmail(email);

      return NextResponse.json(
        {
          ok: true,
          username: newUsername,
          maskedUsername: maskUsername(newUsername),
          updated: true,
        },
        { status: 200 },
      );
    }

    await deleteAdminUsernameRecoveryOtpForEmail(email);

    return NextResponse.json(
      {
        ok: true,
        username: staff.username,
        maskedUsername: maskUsername(staff.username),
        updated: false,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/complete-username-recovery] error", error);
    return NextResponse.json(
      { error: "Could not recover username" },
      { status: 500 },
    );
  }
}
