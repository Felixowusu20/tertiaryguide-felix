import { getDb } from "../../lib/mongodb";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { BlogAdLabel } from "@/app/components/BlogAdLabel";
import { BlogAdSnippets } from "@/app/components/BlogAdSnippets";
import { BlogPostImage } from "@/app/components/BlogPostImage";
import { BlogPagination, BLOG_PAGE_SIZE } from "@/app/components/BlogPagination";
import { getPublicActiveAds } from "@/lib/ads";
import { publicBlogPostFilter } from "@/lib/blog-visibility";
import { Search } from "lucide-react";
import ScrollToTop from "../components/ScrollToTop";

interface BlogPostDoc {
  _id?: import("mongodb").ObjectId;
  title: string;
  slug: string;
  contentHtml: string;
  featuredImageUrl?: string | null;
  status: "Draft" | "Published" | "Scheduled";
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isAd?: boolean;
  schoolId?: string | null;
}

function mapPost(doc: BlogPostDoc) {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    featuredImageUrl: doc.featuredImageUrl ?? null,
    date: (doc.publishedAt ?? doc.createdAt).toISOString(),
    excerpt:
      doc.contentHtml.replace(/<[^>]+>/g, " ").slice(0, 150) + "...",
    isAd: doc.isAd === true,
  };
}

async function fetchPosts(query?: string, schoolId?: string, page = 1) {
  const db = await getDb();
  const postsCollect = db.collection<BlogPostDoc>("blogPosts");

  const now = new Date();

  let filter: Record<string, unknown> = {
    status: { $in: ["Published", "Scheduled"] },
    publishedAt: { $lte: now },
  };

  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { contentHtml: { $regex: query, $options: "i" } },
    ];
  }

  if (schoolId) {
    filter.schoolId = schoolId;
  } else {
    // Main blog: hide partner ("secured") school posts
    filter = await publicBlogPostFilter(db, filter);
  }

  const total = await postsCollect.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const [docs, recentDocs] = await Promise.all([
    postsCollect
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip((safePage - 1) * BLOG_PAGE_SIZE)
      .limit(BLOG_PAGE_SIZE)
      .toArray(),
    postsCollect.find(filter).sort({ publishedAt: -1 }).limit(5).toArray(),
  ]);

  return {
    posts: docs.map(mapPost),
    recentPosts: recentDocs.map(mapPost),
    total,
    page: safePage,
    totalPages,
  };
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const blogIndexDescription =
  "Insights, guides, and updates to help you choose programmes, buy university forms, and stay on top of deadlines in Ghana.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; schoolId?: string; page?: string }>;
}): Promise<Metadata> {
  const { q, schoolId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const title = q
    ? `Search: “${q}”`
    : schoolId
      ? "University blog"
      : page > 1
        ? `Blog · Page ${page}`
        : "Blog";
  const description = q
    ? `Search results for “${q}” on the TertiaryGuide blog. ${blogIndexDescription}`
    : blogIndexDescription;

  return {
    title,
    description,
    alternates:
      q || schoolId
        ? {}
        : {
            canonical: page > 1 ? `/blog?page=${page}` : "/blog",
          },
    openGraph: {
      title: `${title} | TertiaryGuide`,
      description,
      type: "website",
      url: "/blog",
      siteName: "TertiaryGuide",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: "TertiaryGuide blog",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TertiaryGuide`,
      description,
      images: ["/og-image.jpg"],
    },
  };
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; schoolId?: string; page?: string }>;
}) {
  const { q, schoolId, page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  const [{ posts, recentPosts, total, page, totalPages }, promoAds] =
    await Promise.all([
      fetchPosts(q, schoolId, requestedPage),
      getPublicActiveAds(),
    ]);
  return (
    <>
      <section className="min-h-screen bg-white text-[#111827]">
  
        {/* NAVBAR */}
        <div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 md:px-10">
          <Header />
        </div>
  
        {/* MAIN */}
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-10 md:px-6 md:pt-5 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_350px]">
  
            {/* ================= MAIN ================= */}
            <main className="min-w-0 space-y-12">
  
              {/* TITLE */}
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {q
                    ? `Search results for "${q}"`
                    : schoolId
                    ? "University Blog"
                    : "Our Blog"}
                </h1>
  
                {(q || schoolId) && (
                  <p className="mt-2 text-gray-500">
                    {total} result{total === 1 ? "" : "s"} found
                  </p>
                )}
              </div>
  
              {/* POSTS */}
              <div className="flex flex-col gap-6">
                {posts.length > 0 ? (
                  posts.map((post, index) => (
                    <article
                      key={post.slug}
                      className="group overflow-hidden rounded-3xl border border-[#E8EEF5] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]"
                    >
  
                      {/* IMAGE */}
                      {post.featuredImageUrl ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="block w-full overflow-hidden bg-[#F3F4F6]"
                        >
                          <BlogPostImage
                            src={post.featuredImageUrl}
                            alt={post.title}
                            variant="list"
                            priority={index === 0}
                          />
                        </Link>
                      ) : (
                        <div className="flex h-48 w-full items-center justify-center bg-gray-100 text-gray-400">
                          No Image Available
                        </div>
                      )}
  
                      {/* CONTENT */}
                      <div className="space-y-4 p-5 sm:p-6">
                        <Link href={`/blog/${post.slug}`}>
                          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold leading-tight tracking-tight hover:text-[#007AFF] sm:text-3xl sm:gap-2.5">
                            {post.isAd && <BlogAdLabel className="align-middle" />}
                            <span className="min-w-0">{post.title}</span>
                          </h2>
                        </Link>
  
                        <p className="line-clamp-3 text-lg leading-8 text-[#374151]">
                          {post.excerpt}
                        </p>
  
                        <div className="flex items-center gap-4 text-sm font-medium text-[#007AFF]">
                          <span>{formatDate(post.date)}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                          <Link
                            href={`/blog/${post.slug}`}
                            className="hover:underline"
                          >
                            Read More →
                          </Link>
                        </div>
                      </div>
  
                    </article>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-xl text-gray-500">
                      No posts found matching your search.
                    </p>
  
                    <Link
                      href="/blog"
                      className="mt-4 inline-block font-bold text-[#007AFF] hover:underline"
                    >
                      View all posts
                    </Link>
                  </div>
                )}

                <BlogPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  q={q}
                  schoolId={schoolId}
                />
              </div>
  
            </main>
  
            {/* ================= SIDEBAR ================= */}
            <aside className="space-y-10 lg:pl-4">
  
              {/* SEARCH */}
              <form action="/blog" method="GET" className="relative">
                {schoolId ? (
                  <input type="hidden" name="schoolId" value={schoolId} />
                ) : null}
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search Keyword"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-[#007AFF]"
                />
  
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-4 text-[#007AFF]"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
  
              {/* RECENT POSTS */}
              <div>
                <h3 className="mb-6 text-lg font-bold border-l-4 border-[#007AFF] pl-3">
                  Recent Posts
                </h3>
  
                <div className="flex flex-col gap-6">
                  {recentPosts.map((rp) => (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="group flex gap-4"
                    >
                      <div className="shrink-0">
                        {rp.featuredImageUrl ? (
                          <BlogPostImage
                            src={rp.featuredImageUrl}
                            alt={rp.title}
                            variant="thumb"
                          />
                        ) : (
                          <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-[#F3F4F6] text-gray-400 ring-1 ring-gray-900/5">
                            📝
                          </div>
                        )}
                      </div>
  
                      <div className="flex flex-col justify-center">
                        <h4 className="line-clamp-2 text-sm font-semibold text-[#007AFF] group-hover:underline">
                          <span className="align-middle">
                            {rp.isAd && <BlogAdLabel className="mr-1.5" />}
                            {rp.title}
                          </span>
                        </h4>
  
                        <p className="mt-1 text-xs text-gray-500 italic">
                          By <span className="underline">Admin</span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
  
              <BlogAdSnippets ads={promoAds} />
            </aside>
          </div>
        </div>
  
        <ScrollToTop />
      </section>
      <Footer />
    </>
  );
}