import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { requireSuperadmin, STAFF_ROLES } from "../../../../lib/admin-access";
import { hashPassword } from "../../../../lib/password";

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const users = db.collection("users");

    const staff = await users
      .find<{
        _id: unknown;
        username?: string;
        email?: string;
        role?: string;
        createdAt?: Date;
        lastLoginAt?: Date;
      }>(
        { role: { $in: [...STAFF_ROLES] } },
        { projection: { passwordHash: 0 } },
      )
      .sort({ role: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json(
      {
        ok: true,
        staff: staff.map((member) => ({
          id: String(member._id),
          username: member.username || "",
          email: member.email || "",
          role: member.role || "admin",
          createdAt: member.createdAt?.toISOString(),
          lastLoginAt: member.lastLoginAt?.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/staff] GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { username, email, password, role } = body as {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const normalizedUsername = username?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const nextRole = role === "superadmin" ? "superadmin" : "admin";

    if (!normalizedUsername || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required." },
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

    const existing = await users.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with that username or email already exists." },
        { status: 409 },
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(password);
    const result = await users.insertOne({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: nextRole,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.user.username,
    });

    return NextResponse.json(
      {
        ok: true,
        staff: {
          id: String(result.insertedId),
          username: normalizedUsername,
          email: normalizedEmail,
          role: nextRole,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/staff] POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
