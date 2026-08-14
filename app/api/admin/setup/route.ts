import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { hashPassword } from "../../../../lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, confirmPassword } = body as {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    const normalizedUsername = username?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const superadminCount = await users.countDocuments({ role: "superadmin" });
    if (superadminCount > 0) {
      return NextResponse.json(
        {
          error:
            "A superadmin already exists. Sign in instead, or ask your superadmin to create additional accounts.",
        },
        { status: 403 },
      );
    }

    const existing = await users.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existing && existing.role !== "superadmin") {
      return NextResponse.json(
        {
          error:
            "That username or email is already used by another account. Choose different credentials.",
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(password);

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            username: normalizedUsername,
            email: normalizedEmail,
            passwordHash,
            role: "superadmin",
            updatedAt: now,
          },
        },
      );

      return NextResponse.json(
        {
          ok: true,
          admin: {
            username: normalizedUsername,
            email: normalizedEmail,
            role: "superadmin",
          },
        },
        { status: 200 },
      );
    }

    await users.insertOne({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: "superadmin",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        admin: {
          username: normalizedUsername,
          email: normalizedEmail,
          role: "superadmin",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/setup] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
