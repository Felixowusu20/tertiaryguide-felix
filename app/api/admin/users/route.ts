import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  nonStaffUserFilter,
  requireStaff,
} from "../../../../lib/admin-access";

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

    const cursor = usersCollection
      .find<{
        _id: unknown;
        username?: string;
        email?: string;
        phone?: string;
        createdAt?: Date;
      }>(nonStaffUserFilter(), { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .limit(Number.isNaN(limit) ? 20 : limit);

    const users = await cursor.toArray();

    const sanitized = users.map((u) => ({
      id: String(u._id),
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      createdAt: u.createdAt ? u.createdAt.toISOString() : undefined,
    }));

    return NextResponse.json({ ok: true, users: sanitized }, { status: 200 });
  } catch (error) {
    console.error("[admin/users] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
