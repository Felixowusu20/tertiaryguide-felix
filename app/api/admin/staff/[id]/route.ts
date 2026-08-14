import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import {
  requireSuperadmin,
  STAFF_ROLES,
} from "../../../../../lib/admin-access";
import { hashPassword } from "../../../../../lib/password";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireSuperadmin(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid staff id." }, { status: 400 });
    }

    const body = await req.json();
    const { password, role } = body as {
      password?: string;
      role?: string;
    };

    const db = await getDb();
    const users = db.collection("users");
    const targetId = new ObjectId(id);

    const target = await users.findOne<{
      _id: ObjectId;
      username: string;
      role?: string;
    }>({
      _id: targetId,
      role: { $in: [...STAFF_ROLES] },
    });

    if (!target) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof password === "string" && password.trim()) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }
      updates.passwordHash = await hashPassword(password);
    }

    if (role === "admin" || role === "superadmin") {
      if (
        target.role === "superadmin" &&
        role !== "superadmin" &&
        target.username === auth.user.username
      ) {
        return NextResponse.json(
          { error: "You cannot demote your own superadmin account." },
          { status: 400 },
        );
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: "No valid updates provided." },
        { status: 400 },
      );
    }

    await users.updateOne({ _id: targetId }, { $set: updates });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/staff/[id]] PATCH error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireSuperadmin(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid staff id." }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection("users");
    const targetId = new ObjectId(id);

    const target = await users.findOne<{
      _id: ObjectId;
      username: string;
      role?: string;
    }>({
      _id: targetId,
      role: { $in: [...STAFF_ROLES] },
    });

    if (!target) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (target.username === auth.user.username) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    if (target.role === "superadmin") {
      const superadminCount = await users.countDocuments({ role: "superadmin" });
      if (superadminCount <= 1) {
        return NextResponse.json(
          { error: "At least one superadmin must remain." },
          { status: 400 },
        );
      }
    }

    await users.deleteOne({ _id: targetId });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/staff/[id]] DELETE error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
