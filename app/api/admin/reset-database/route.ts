import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { verifyPassword } from "../../../../lib/password";
import {
  nonStaffUserFilter,
  requireSuperadmin,
} from "../../../../lib/admin-access";
import {
  invalidateAssistanceCache,
  invalidateCheckersCache,
  invalidateSchoolsCache,
  invalidateUserCache,
} from "../../../../lib/redis";

const CONFIRMATION_PHRASE = "RESET";

type CachedUserShape = {
  _id: { toString(): string };
  username?: string;
  email?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const { password, confirmation } = (body ?? {}) as {
      password?: string;
      confirmation?: string;
    };

    if (confirmation !== CONFIRMATION_PHRASE) {
      return NextResponse.json(
        { error: `Type ${CONFIRMATION_PHRASE} to confirm the reset.` },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Your password is required to confirm the reset." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const actor = await users.findOne<{ passwordHash?: string }>({
      _id: auth.user._id,
    });
    if (!actor?.passwordHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const passwordValid = await verifyPassword(password, actor.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Incorrect password. The database was not reset." },
        { status: 400 },
      );
    }

    // Snapshot non-staff users before wipe so Redis user:* keys can be cleared.
    const nonStaffUsers = await users
      .find<CachedUserShape>(nonStaffUserFilter(), {
        projection: { username: 1, email: 1, phone: 1 },
      })
      .toArray();

    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    let deletedTotal = 0;
    const clearedCollections: string[] = [];

    for (const { name } of collections) {
      if (name.startsWith("system.")) continue;

      // Keep staff accounts so admins are not locked out after the reset.
      const filter = name === "users" ? nonStaffUserFilter() : {};
      const result = await db.collection(name).deleteMany(filter);
      if (result.deletedCount > 0) {
        deletedTotal += result.deletedCount;
        clearedCollections.push(name);
      }
    }

    await Promise.all([
      invalidateCheckersCache(),
      invalidateSchoolsCache(),
      invalidateAssistanceCache(),
      ...nonStaffUsers
        .filter((user) => user.username && user.email)
        .map((user) =>
          invalidateUserCache({
            id: String(user._id),
            username: user.username!,
            email: user.email!,
            phone: user.phone,
          }),
        ),
    ]);

    console.warn(
      `[admin/reset-database] Database reset by superadmin "${auth.user.username}". ` +
        `Deleted ${deletedTotal} documents across: ${clearedCollections.join(", ") || "none"}.`,
    );

    return NextResponse.json({
      ok: true,
      deletedTotal,
      clearedCollections,
    });
  } catch (error) {
    console.error("[admin/reset-database] POST error", error);
    return NextResponse.json(
      { error: "Failed to reset the database." },
      { status: 500 },
    );
  }
}
