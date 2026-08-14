import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import { requireStaff } from "../../../../../../lib/admin-access";
import { findSchoolById } from "../../../../../../lib/admissions/schools";
import { SCHOOL_ADMIN_ROLE } from "../../../../../../lib/admissions/types";
import { hashPassword } from "../../../../../../lib/password";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
  }

  const db = await getDb();
  const school = await findSchoolById(db, id);
  if (!school?.isPartner) {
    return NextResponse.json({ error: "Partner school not found" }, { status: 404 });
  }

  const admins = await db
    .collection("users")
    .find(
      { role: SCHOOL_ADMIN_ROLE, schoolId: new ObjectId(id) },
      { projection: { passwordHash: 0 } },
    )
    .toArray();

  return NextResponse.json({
    ok: true,
    admins: admins.map((a) => ({
      id: String(a._id),
      username: a.username,
      email: a.email ?? null,
      createdAt: a.createdAt ?? null,
      lastLoginAt: a.lastLoginAt ?? null,
    })),
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const school = await findSchoolById(db, id);
    if (!school?.isPartner) {
      return NextResponse.json({ error: "Partner school not found" }, { status: 404 });
    }

    const users = db.collection("users");
    const existing = await users.findOne({
      $or: [{ username }, ...(email ? [{ email }] : [])],
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username or email already in use" },
        { status: 400 },
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(password);
    const result = await users.insertOne({
      username,
      email: email || `${username}@${school.slug || "school"}.local`,
      passwordHash,
      role: SCHOOL_ADMIN_ROLE,
      schoolId: new ObjectId(id),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        admin: {
          id: String(result.insertedId),
          username,
          email: email || `${username}@${school.slug || "school"}.local`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/partner-schools/:id/admins] POST", error);
    return NextResponse.json({ error: "Failed to create school admin" }, { status: 500 });
  }
}
