import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";

interface ProgrammeDoc {
    _id?: ObjectId;
    schoolId: ObjectId;
    name: string;
    cutoff: string;
    preRequisite?: string | null;
    durationYears?: number | null;
    createdAt: Date;
}

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id: schoolId } = await context.params;
        if (!schoolId || !ObjectId.isValid(schoolId)) {
            return NextResponse.json({ error: "Invalid school id" }, { status: 400 });
        }

        const db = await getDb();
        const programmes = db.collection<ProgrammeDoc>("programmes");

        const docs = await programmes
            .find({ schoolId: new ObjectId(schoolId) }, { sort: { name: 1 } })
            .limit(100)
            .toArray();

        const items = docs.map((doc) => ({
            id: String(doc._id),
            name: doc.name,
            cutoff: doc.cutoff,
            preRequisite: doc.preRequisite ?? null,
            durationYears: doc.durationYears ?? null,
        }));

        return NextResponse.json({ ok: true, programmes: items }, { status: 200 });
    } catch (error) {
        console.error("[schools/[id]/programmes] GET error", error);
        return NextResponse.json(
            { error: "Failed to load programmes" },
            { status: 500 },
        );
    }
}
