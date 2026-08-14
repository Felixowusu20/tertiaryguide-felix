import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const users = db.collection("users");

    const superadminCount = await users.countDocuments({ role: "superadmin" });
    const staffCount = await users.countDocuments({
      role: { $in: ["admin", "superadmin"] },
    });

    return NextResponse.json(
      {
        ok: true,
        needsSetup: superadminCount === 0,
        hasSuperadmin: superadminCount > 0,
        hasStaff: staffCount > 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/setup/status] error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
