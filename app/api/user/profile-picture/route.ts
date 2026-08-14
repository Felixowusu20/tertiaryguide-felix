
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, image } = body;

        if (!email || !image) {
            return NextResponse.json(
                { error: "Email and image are required" },
                { status: 400 },
            );
        }

        // Basic validation of base64 image
        if (!image.startsWith("data:image")) {
            return NextResponse.json(
                { error: "Invalid image format" },
                { status: 400 },
            );
        }

        const db = await getDb();
        const result = await db.collection("users").updateOne(
            { email },
            { $set: { profilePicture: image } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating profile picture:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
