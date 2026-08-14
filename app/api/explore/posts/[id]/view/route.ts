import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureExploreIndexes, explorePostsCollection } from "@/lib/explore/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const db = await getDb();
    await ensureExploreIndexes(db);
    const posts = explorePostsCollection(db);

    const result = await posts.findOneAndUpdate(
      { _id: new ObjectId(id), status: "Published" },
      { $inc: { viewCount: 1 } },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      viewCount: result.viewCount ?? 0,
    });
  } catch (error) {
    console.error("[explore/posts/:id/view] POST error", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
