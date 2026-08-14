import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import { hashPassword, verifyPassword } from "../../../../../lib/password";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  if (auth.actor.kind !== "school_admin") {
    return NextResponse.json(
      {
        error:
          "Only the school admin account can change its password from this portal.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
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

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");
    const adminDoc = await users.findOne({
      _id: auth.actor.user._id,
    });

    if (!adminDoc?.passwordHash) {
      return NextResponse.json(
        { error: "Could not load your account." },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(
      currentPassword,
      adminDoc.passwordHash as string,
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await users.updateOne(
      { _id: auth.actor.user._id },
      { $set: { passwordHash, updatedAt: new Date() } },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[school-portal/change-password] POST", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 },
    );
  }
}
