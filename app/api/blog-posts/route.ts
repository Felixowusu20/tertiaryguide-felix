import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { publicBlogPostFilter } from "../../../lib/blog-visibility";

interface BlogPostDoc {
  _id?: import("mongodb").ObjectId;
  title: string;
  slug: string;
  contentHtml: string;
  featuredImageUrl?: string | null;
  status: "Draft" | "Published" | "Scheduled";
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isAd?: boolean;
  schoolId?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const posts = db.collection<BlogPostDoc>("blogPosts");

    const now = new Date();
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 6, 1), 50) : 6;

    const filter = await publicBlogPostFilter(db, {
      status: { $in: ["Published", "Scheduled"] },
      publishedAt: { $lte: now },
    });

    const docs = await posts
      .find(filter, { sort: { publishedAt: -1 } })
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const visibleDocs = hasMore ? docs.slice(0, limit) : docs;

    return NextResponse.json(
      {
        ok: true,
        hasMore,
        posts: visibleDocs.map((doc) => ({
          id: String(doc._id),
          title: doc.title,
          slug: doc.slug,
          featuredImageUrl: doc.featuredImageUrl ?? null,
          excerpt: doc.contentHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 220),
          date: doc.publishedAt?.toISOString() ?? doc.createdAt.toISOString(),
          isAd: doc.isAd === true,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[blog-posts] GET error", error);
    return NextResponse.json(
      { error: "Failed to load blog posts" },
      { status: 500 },
    );
  }
}
