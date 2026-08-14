import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { invalidateSchoolsCache } from "../../../../../lib/redis";
import {
  normalizeSchoolCategories,
  primarySchoolCategory,
  schoolCategoriesFromRequestBody,
} from "../../../../../lib/schoolCategories";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
        }

        const body = await req.json().catch(() => null as unknown as null);

        // Validate required fields if they are provided, or just general validation
        const name = typeof body?.name === "string" ? body.name.trim() : undefined;

        if (name === "") {
            return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
        }

        const updates: Record<string, any> = {};
        if (name) updates.name = name;
        if (typeof body?.alias === "string") updates.alias = body.alias.trim() || null;
        if (typeof body?.logoSrc === "string") updates.logoSrc = body.logoSrc.trim() || null;
        if (typeof body?.logoAlt === "string") updates.logoAlt = body.logoAlt.trim() || null;
        if (typeof body?.about === "string") updates.about = body.about.trim() || null;
        if (typeof body?.preRequisite === "string") updates.preRequisite = body.preRequisite.trim() || null;

        // Numeric and special fields
        if (body?.priceGhs !== undefined) {
            if (body.priceGhs === "" || body.priceGhs === null) {
                updates.priceGhs = null;
            } else {
                const val = Number(body.priceGhs);
                if (!Number.isNaN(val) && val >= 0) updates.priceGhs = val;
            }
        }

        if (body?.durationYears !== undefined) {
            if (body.durationYears === "" || body.durationYears === null) {
                updates.durationYears = null;
            } else {
                const val = Number(body.durationYears);
                if (!Number.isNaN(val) && val > 0) updates.durationYears = val;
            }
        }

        if (body?.deadline !== undefined) {
            if (!body.deadline) {
                updates.deadline = null;
            } else {
                const d = new Date(body.deadline);
                if (!Number.isNaN(d.getTime())) updates.deadline = d;
            }
        }

        if (body?.isVerified !== undefined) {
            updates.isVerified = body.isVerified === true;
        }

        if (
            Array.isArray(body?.categories) ||
            typeof body?.category === "string"
        ) {
            const categories = schoolCategoriesFromRequestBody(body);
            updates.categories = [...categories];
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const db = await getDb();
        const updateOp: Record<string, unknown> = { $set: updates };
        if (updates.categories) {
            updateOp.$unset = { category: "" };
        }

        const result = await db.collection("schools").findOneAndUpdate(
            { _id: new ObjectId(id) },
            updateOp as { $set: Record<string, unknown>; $unset?: { category: string } },
            { returnDocument: "after" }
        );

        const doc = (result as { value?: unknown } | null)?.value ?? result;

        if (!doc || typeof doc !== "object" || !("_id" in (doc as object))) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        await invalidateSchoolsCache();

        // Format response consistent with List API
        const schoolDoc = doc as {
            _id: ObjectId;
            name: string;
            alias?: string | null;
            logoSrc?: string | null;
            logoAlt?: string | null;
            priceGhs?: number | null;
            deadline?: Date | null;
            createdAt?: Date;
            about?: string | null;
            preRequisite?: string | null;
            durationYears?: number | null;
            isVerified?: boolean;
            category?: string | null;
            categories?: string[] | null;
        };

        const categories = normalizeSchoolCategories(
            schoolDoc.categories,
            schoolDoc.category,
        );

        const school = {
            id: schoolDoc._id.toString(),
            name: schoolDoc.name,
            alias: schoolDoc.alias ?? null,
            logoSrc: schoolDoc.logoSrc ?? null,
            logoAlt: schoolDoc.logoAlt ?? null,
            priceGhs: schoolDoc.priceGhs ?? null,
            deadline: schoolDoc.deadline ? schoolDoc.deadline.toISOString() : null,
            about: schoolDoc.about ?? null,
            preRequisite: schoolDoc.preRequisite ?? null,
            durationYears: schoolDoc.durationYears ?? null,
            isVerified: !!schoolDoc.isVerified,
            categories,
            category: primarySchoolCategory(categories),
            createdAt: schoolDoc.createdAt?.toISOString(),
        };

        return NextResponse.json({ ok: true, school });
    } catch (error) {
        console.error("[api/admin/schools/[id]] PUT error", error);
        return NextResponse.json(
            { error: "Failed to update school" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: RouteParams,
) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Invalid school ID" },
                { status: 400 },
            );
        }
        const oid = new ObjectId(id);
        const db = await getDb();

        const existing = await db.collection("schools").findOne({ _id: oid });
        if (!existing) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 },
            );
        }

        await db.collection("programmes").deleteMany({ schoolId: oid });
        await db.collection("schoolVouchers").deleteMany({ schoolId: oid });
        await db.collection("blogPosts").updateMany(
            { schoolId: id },
            { $set: { schoolId: null } },
        );
        const result = await db.collection("schools").deleteOne({ _id: oid });
        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 },
            );
        }

        await invalidateSchoolsCache();
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[api/admin/schools/[id]] DELETE error", error);
        return NextResponse.json(
            { error: "Failed to delete school" },
            { status: 500 },
        );
    }
}
