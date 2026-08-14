
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, username, phone } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 },
            );
        }

        const db = await getDb();
        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (phone !== undefined) updateData.phone = phone;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: true, message: "No data to update" });
        }

        const result = await db.collection("users").updateOne(
            { email },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating user info:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
