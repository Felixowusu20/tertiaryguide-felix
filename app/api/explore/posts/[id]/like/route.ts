import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureExploreIndexes, explorePostsCollection } from "@/lib/explore/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Sign in to like posts" }, { status: 401 });
    }

    const db = await getDb();
    await ensureExploreIndexes(db);
    const posts = explorePostsCollection(db);
    const post = await posts.findOne({ _id: new ObjectId(id), status: "Published" });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const likes = Array.isArray(post.likes) ? post.likes : [];
    const liked = likes.includes(email);

    if (liked) {
      await posts.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { likes: email },
          $inc: { likeCount: -1 },
          $set: { updatedAt: new Date() },
        },
      );
    } else {
      await posts.updateOne(
        { _id: new ObjectId(id) },
        {
          $addToSet: { likes: email },
          $inc: { likeCount: 1 },
          $set: { updatedAt: new Date() },
        },
      );
    }

    const refreshed = await posts.findOne({ _id: new ObjectId(id) });
    const nextLikes = Array.isArray(refreshed?.likes) ? refreshed!.likes : [];

    return NextResponse.json({
      ok: true,
      liked: !liked,
      likeCount: refreshed?.likeCount ?? nextLikes.length,
    });
  } catch (error) {
    console.error("[explore/posts/:id/like] POST error", error);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}
