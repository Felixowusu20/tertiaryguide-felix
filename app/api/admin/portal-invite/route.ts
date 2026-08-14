import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { findValidSchoolPortalInvite } from "../../../../lib/admissions/school-portal-invite";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim() || "";
    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    const db = await getDb();
    const invite = await findValidSchoolPortalInvite(db, token);
    if (!invite) {
      return NextResponse.json(
        {
          error:
            "This invitation link is invalid or has expired. Please ask TertiaryGuide for a new invite.",
        },
        { status: 410 },
      );
    }

    return NextResponse.json({
      ok: true,
      schoolName: invite.schoolName,
      schoolSlug: invite.schoolSlug,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin/portal-invite] GET", error);
    return NextResponse.json(
      { error: "Could not validate invitation" },
      { status: 500 },
    );
  }
}
