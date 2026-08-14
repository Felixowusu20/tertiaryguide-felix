import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";
import { requireSchoolPortalAccess } from "../../../../../../lib/admin-access";

type Ctx = { params: Promise<{ slug: string; id: string }> };

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

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const post = await db.collection<BlogPostDoc>("blogPosts").findOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId.toString(),
    });

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      post: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        contentHtml: post.contentHtml,
        featuredImageUrl: post.featuredImageUrl ?? null,
        status: post.status,
        scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : "",
        updatedAt: post.updatedAt.toISOString(),
        schoolId: post.schoolId || null,
        isAd: post.isAd === true,
      },
    });
  } catch (error) {
    console.error("[school-portal/blog-posts/:id] GET", error);
    return NextResponse.json(
      { error: "Failed to load blog post" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

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
    const schoolId = auth.schoolId.toString();
    const posts = db.collection<BlogPostDoc>("blogPosts");

    const result = await posts.findOneAndUpdate(
      { _id: new ObjectId(id), schoolId },
      {
        $set: {
          title: titleRaw,
          contentHtml: contentHtmlRaw,
          featuredImageUrl: featuredImageUrlRaw || null,
          status,
          scheduledAt,
          ...(publishedAt ? { publishedAt } : {}),
          updatedAt: now,
          schoolId,
          isAd: false,
        },
      },
      { returnDocument: "after" },
    );

    const updatedDoc =
      (result as { value?: BlogPostDoc | null })?.value ||
      (result as BlogPostDoc | null);

    if (!updatedDoc || !updatedDoc._id) {
      return NextResponse.json(
        { error: "Blog post not found or update failed" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      post: {
        id: String(updatedDoc._id),
        title: updatedDoc.title,
        status: updatedDoc.status,
        featuredImageUrl: updatedDoc.featuredImageUrl ?? null,
        updatedAt: updatedDoc.updatedAt.toISOString(),
        schoolId: updatedDoc.schoolId || null,
        isAd: updatedDoc.isAd === true,
      },
    });
  } catch (error) {
    console.error("[school-portal/blog-posts/:id] PUT", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const auth = await requireSchoolPortalAccess(req, slug);
  if ("response" in auth) return auth.response;

  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("blogPosts").deleteOne({
      _id: new ObjectId(id),
      schoolId: auth.schoolId.toString(),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[school-portal/blog-posts/:id] DELETE", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 },
    );
  }
}
