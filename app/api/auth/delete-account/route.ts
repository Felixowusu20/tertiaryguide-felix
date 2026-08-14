import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  getCachedUserByEmail,
  invalidateUserCache,
} from "../../../../lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const result = await users.deleteOne({ email: email.toLowerCase() });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 },
      );
    }

    const cached = await getCachedUserByEmail(email);
    if (cached) {
      await invalidateUserCache(cached);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("delete-account error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
