import { NextRequest, NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { verifyPassword } from "../../../../lib/password";
import { STAFF_ROLES } from "../../../../lib/admin-access";
import { SCHOOL_ADMIN_ROLE } from "../../../../lib/admissions/types";
import { findSchoolById } from "../../../../lib/admissions/schools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const adminDoc = await users.findOne<{
      _id: ObjectId;
      username: string;
      email: string;
      passwordHash?: string;
      role?: string;
      schoolId?: ObjectId;
    }>({
      username,
      role: { $in: [...STAFF_ROLES, SCHOOL_ADMIN_ROLE] },
    });

    if (!adminDoc || !adminDoc.passwordHash) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(password, adminDoc.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 400 },
      );
    }

    await users.updateOne(
      { _id: adminDoc._id },
      { $set: { lastLoginAt: new Date() } },
    );

    const role = adminDoc.role || "admin";
    let schoolSlug: string | null = null;
    let schoolId: string | null = null;

    if (role === SCHOOL_ADMIN_ROLE && adminDoc.schoolId) {
      schoolId = String(adminDoc.schoolId);
      const school = await findSchoolById(db, schoolId);
      schoolSlug = school?.slug ?? null;
      if (school && school.isActive === false) {
        return NextResponse.json(
          { error: "This school portal is currently disabled" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        admin: {
          id: String(adminDoc._id),
          username: adminDoc.username,
          email: adminDoc.email,
          role,
          schoolId,
          schoolSlug,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/login] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
