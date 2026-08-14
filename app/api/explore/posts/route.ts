import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ensureExploreIndexes, explorePostsCollection } from "@/lib/explore/db";
import { serializeExplorePost } from "@/lib/explore/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      50,
    );
    const cursor = searchParams.get("cursor");
    const viewerEmail = (searchParams.get("email") || "").trim().toLowerCase();

    const db = await getDb();
    await ensureExploreIndexes(db);
    const posts = explorePostsCollection(db);

    const filter: Record<string, unknown> = { status: "Published" };
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        filter.publishedAt = { $lt: cursorDate };
      }
    }

    const docs = await posts
      .find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    const nextCursor =
      docs.length === limit
        ? docs[docs.length - 1]?.publishedAt?.toISOString?.() ||
          docs[docs.length - 1]?.createdAt?.toISOString?.() ||
          null
        : null;

    return NextResponse.json({
      ok: true,
      posts: docs.map((doc) => serializeExplorePost(doc, viewerEmail || null)),
      nextCursor,
    });
  } catch (error) {
    console.error("[explore/posts] GET error", error);
    return NextResponse.json(
      { error: "Failed to load explore feed" },
      { status: 500 },
    );
  }
}
