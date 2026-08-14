import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ensureExploreIndexes,
  exploreCommentsCollection,
  explorePostsCollection,
} from "@/lib/explore/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const db = await getDb();
    await ensureExploreIndexes(db);
    const comments = await exploreCommentsCollection(db)
      .find({ postId: new ObjectId(id) })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      ok: true,
      comments: comments.map((c) => ({
        id: String(c._id),
        postId: String(c.postId),
        userEmail: c.userEmail,
        userName: c.userName,
        userAvatar: c.userAvatar || "/hero/avatar.png",
        text: c.text,
        likes: Array.isArray(c.likes) ? c.likes : [],
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[explore/posts/:id/comments] GET error", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const userName =
      typeof body.userName === "string" ? body.userName.trim() : "";
    const userAvatar =
      typeof body.userAvatar === "string" && body.userAvatar.trim()
        ? body.userAvatar.trim()
        : "/hero/avatar.png";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Sign in to comment" },
        { status: 401 },
      );
    }
    if (!text) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const db = await getDb();
    await ensureExploreIndexes(db);
    const posts = explorePostsCollection(db);
    const post = await posts.findOne({
      _id: new ObjectId(id),
      status: "Published",
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const now = new Date();
    const doc = {
      postId: new ObjectId(id),
      userEmail: email,
      userName: userName || email.split("@")[0] || "User",
      userAvatar,
      text,
      likes: [] as string[],
      createdAt: now,
    };

    const result = await exploreCommentsCollection(db).insertOne(doc);
    await posts.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { commentCount: 1 }, $set: { updatedAt: now } },
    );

    return NextResponse.json({
      ok: true,
      comment: {
        id: String(result.insertedId),
        postId: id,
        userEmail: doc.userEmail,
        userName: doc.userName,
        userAvatar: doc.userAvatar,
        text: doc.text,
        likes: [],
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[explore/posts/:id/comments] POST error", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 },
    );
  }
}
