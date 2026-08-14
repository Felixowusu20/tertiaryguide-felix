import { NextRequest, NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { verifyPassword } from "../../../../lib/password";
import { cacheUser, type CachedUser } from "../../../../lib/redis";

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

    const userDoc = await users.findOne<{
      _id: ObjectId;
      email: string;
      username?: string;
      phone?: string;
      passwordHash?: string;
    }>({ username });

    if (!userDoc || !userDoc.passwordHash) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(password, userDoc.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 400 },
      );
    }

    await users.updateOne(
      { _id: userDoc._id },
      { $set: { lastLoginAt: new Date() } },
    );

    const cachedUser: CachedUser = {
      id: String(userDoc._id),
      email: userDoc.email,
      username: userDoc.username || "",
      phone: userDoc.phone,
    };

    await cacheUser(cachedUser);

    return NextResponse.json(
      {
        ok: true,
        user: cachedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("login error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
