import { NextRequest, NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { hashPassword, verifyPassword } from "../../../../lib/password";
import { STAFF_ROLES } from "../../../../lib/admin-access";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, currentPassword, newPassword } = body as {
      username?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "All password fields are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const adminDoc = await users.findOne<{
      _id: ObjectId;
      passwordHash?: string;
    }>({ username, role: { $in: [...STAFF_ROLES] } });

    if (!adminDoc?.passwordHash) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(currentPassword, adminDoc.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await users.updateOne(
      { _id: adminDoc._id },
      { $set: { passwordHash, updatedAt: new Date() } },
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/change-password] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
