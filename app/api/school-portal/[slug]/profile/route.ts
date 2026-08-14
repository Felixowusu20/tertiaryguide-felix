import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";
import {
  findSchoolById,
  schoolsCollection,
  serializePartnerSchool,
} from "../../../../../lib/admissions/schools";
import { normalizeBrandColors } from "../../../../../lib/brand-theme";
import { invalidateSchoolsCache } from "../../../../../lib/redis";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  const db = await getDb();
  const school = await findSchoolById(db, auth.schoolId.toString());
  if (!school || school.isPartner !== true) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    school: serializePartnerSchool(school),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const db = await getDb();
    const $set: Record<string, unknown> = { updatedAt: new Date() };

    if (body?.deadline !== undefined) {
      if (body.deadline === null || body.deadline === "") {
        $set.deadline = null;
      } else if (typeof body.deadline === "string") {
        const d = new Date(body.deadline);
        $set.deadline = Number.isNaN(d.getTime()) ? null : d;
      }
    }

    if (body?.voucherPrice !== undefined) {
      if (body.voucherPrice === null || body.voucherPrice === "") {
        $set.voucherPrice = null;
        $set.priceGhs = null;
      } else {
        const n = Number(body.voucherPrice);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json(
            { error: "Voucher price must be a non-negative number" },
            { status: 400 },
          );
        }
        $set.voucherPrice = n;
        $set.priceGhs = n;
      }
    }

    for (const key of [
      "undergraduateVoucherPrice",
      "postgraduateVoucherPrice",
    ] as const) {
      if (body?.[key] !== undefined) {
        if (body[key] === null || body[key] === "") {
          $set[key] = null;
        } else {
          const n = Number(body[key]);
          if (!Number.isFinite(n) || n < 0) {
            return NextResponse.json(
              { error: `${key} must be a non-negative number` },
              { status: 400 },
            );
          }
          $set[key] = n;
          if (key === "undergraduateVoucherPrice") {
            $set.voucherPrice = n;
            $set.priceGhs = n;
          }
        }
      }
    }

    if (Array.isArray(body?.brandColors) || typeof body?.brandColor === "string") {
      const colors = normalizeBrandColors(
        Array.isArray(body?.brandColors) ? body.brandColors : null,
        typeof body?.brandColor === "string" ? body.brandColor : null,
      );
      $set.brandColors = colors;
      $set.brandColor = colors[0];
    } else if (body?.brandColor === null) {
      $set.brandColor = null;
      $set.brandColors = null;
    }

    if (typeof body?.description === "string") {
      const text = body.description.trim() || null;
      $set.description = text;
      $set.about = text;
    }

    if (typeof body?.alias === "string") {
      $set.alias = body.alias.trim() || null;
    }

    await schoolsCollection(db).updateOne(
      { _id: new ObjectId(auth.schoolId) },
      { $set },
    );
    await invalidateSchoolsCache();

    const updated = await findSchoolById(db, auth.schoolId.toString());
    return NextResponse.json({
      ok: true,
      school: updated ? serializePartnerSchool(updated) : null,
    });
  } catch (error) {
    console.error("[school-portal/profile] PATCH", error);
    return NextResponse.json(
      { error: "Failed to update school profile" },
      { status: 500 },
    );
  }
}
