import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../lib/admin-access";

type Ctx = { params: Promise<{ slug: string }> };

interface BlogPostDoc {
  _id?: ObjectId;
  title: string;
  slug: string;
  contentHtml: string;
  featuredImageUrl?: string | null;
  status: "Draft" | "Published" | "Scheduled";
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  schoolId?: string | null;
  isAd?: boolean;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function serializePost(doc: BlogPostDoc) {
  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    featuredImageUrl: doc.featuredImageUrl ?? null,
    updatedAt: doc.updatedAt.toISOString(),
    schoolId: doc.schoolId || null,
    isAd: doc.isAd === true,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const db = await getDb();
    const schoolId = auth.schoolId.toString();
    const docs = await db
      .collection<BlogPostDoc>("blogPosts")
      .find({ schoolId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      ok: true,
      schoolId,
      posts: docs.map(serializePost),
    });
  } catch (error) {
    console.error("[school-portal/blog-posts] GET", error);
    return NextResponse.json(
      { error: "Failed to load blog posts" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const titleRaw = typeof body?.title === "string" ? body.title.trim() : "";
    const contentHtmlRaw =
      typeof body?.contentHtml === "string" ? body.contentHtml.trim() : "";
    const featuredImageUrlRaw =
      typeof body?.featuredImageUrl === "string"
        ? body.featuredImageUrl.trim()
        : "";
    const statusRaw = typeof body?.status === "string" ? body.status : "";
    const scheduledAtRaw =
      typeof body?.scheduledAt === "string" ? body.scheduledAt : "";

    if (!titleRaw) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!contentHtmlRaw) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const allowedStatuses = ["Draft", "Published", "Scheduled"] as const;
    const status = allowedStatuses.includes(statusRaw as (typeof allowedStatuses)[number])
      ? (statusRaw as BlogPostDoc["status"])
      : "Draft";

    let scheduledAt: Date | null = null;
    if (status === "Scheduled" && scheduledAtRaw) {
      const d = new Date(scheduledAtRaw);
      if (!Number.isNaN(d.getTime())) scheduledAt = d;
    }

    const now = new Date();
    let publishedAt: Date | null = null;
    if (status === "Published") {
      publishedAt = now;
    } else if (status === "Scheduled" && scheduledAt) {
      publishedAt = scheduledAt;
    }

    const db = await getDb();
    const posts = db.collection<BlogPostDoc>("blogPosts");
    await posts.createIndex({ slug: 1 }, { unique: true });
    await posts.createIndex({ schoolId: 1, updatedAt: -1 });

    const baseSlug = slugify(titleRaw) || "post";
    let postSlug = baseSlug;
    let counter = 1;
    while (await posts.findOne({ slug: postSlug })) {
      counter += 1;
      postSlug = `${baseSlug}-${counter}`;
    }

    const schoolId = auth.schoolId.toString();
    const doc: BlogPostDoc = {
      title: titleRaw,
      slug: postSlug,
      contentHtml: contentHtmlRaw,
      featuredImageUrl: featuredImageUrlRaw || null,
      status,
      scheduledAt,
      publishedAt,
      createdAt: now,
      updatedAt: now,
      schoolId,
      isAd: false,
    };

    const result = await posts.insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        post: {
          ...serializePost({ ...doc, _id: result.insertedId }),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[school-portal/blog-posts] POST", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 },
    );
  }
}
