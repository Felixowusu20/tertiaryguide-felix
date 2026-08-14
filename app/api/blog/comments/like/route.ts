
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { commentId, userEmail } = body;

        if (!commentId || !userEmail) {
            return NextResponse.json({ error: "Missing commentId or userEmail" }, { status: 400 });
        }

        const db = await getDb();
        const comment = await db.collection("blogComments").findOne({ _id: new ObjectId(commentId) });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const likes = Array.isArray(comment.likes) ? comment.likes : [];
        const hasLiked = likes.includes(userEmail);

        if (hasLiked) {
            // Unlike
            await db.collection("blogComments").updateOne(
                { _id: new ObjectId(commentId) },
                { $pull: { likes: userEmail } }
            );
        } else {
            // Like
            await db.collection("blogComments").updateOne(
                { _id: new ObjectId(commentId) },
                { $addToSet: { likes: userEmail } }
            );
        }

        return NextResponse.json({ ok: true, liked: !hasLiked }, { status: 200 });
    } catch (error) {
        console.error("[blog/comments/like] POST error", error);
        return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
    }
}
