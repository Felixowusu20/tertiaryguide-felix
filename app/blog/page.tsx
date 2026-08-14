import { getDb } from "../../lib/mongodb";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { BlogAdLabel } from "@/app/components/BlogAdLabel";
import { BlogAdSnippets } from "@/app/components/BlogAdSnippets";
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

async function fetchPosts(query?: string, schoolId?: string) {
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

  const docs = await postsCollect
    .find(filter)
    .sort({ publishedAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    featuredImageUrl: doc.featuredImageUrl ?? null,
    date: (doc.publishedAt ?? doc.createdAt).toISOString(),
    excerpt:
      doc.contentHtml.replace(/<[^>]+>/g, " ").slice(0, 150) + "...",
    isAd: doc.isAd === true,
  }));
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
  searchParams: Promise<{ q?: string; schoolId?: string }>;
}): Promise<Metadata> {
  const { q, schoolId } = await searchParams;
  const title = q
    ? `Search: “${q}”`
    : schoolId
      ? "University blog"
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
            canonical: "/blog",
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
  searchParams: Promise<{ q?: string; schoolId?: string }>;
}) {
  const { q, schoolId } = await searchParams;
  const [posts, promoAds] = await Promise.all([
    fetchPosts(q, schoolId),
    getPublicActiveAds(),
  ]);
  const recentPosts = posts.slice(0, 5);
  return (
    <>
      <section className="min-h-screen bg-white text-[#111827]">
  
        {/* NAVBAR */}
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-4 md:gap-8 md:px-10 md:py-8">
          <Header />
        </div>
  
        {/* MAIN */}
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_350px]">
  
            {/* ================= MAIN ================= */}
            <main className="min-w-0 space-y-12">
  
              {/* TITLE */}
              <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {q
                    ? `Search results for "${q}"`
                    : schoolId
                    ? "University Blog"
                    : "Our Blog"}
                </h1>
  
                {(q || schoolId) && (
                  <p className="mt-2 text-gray-500">
                    {posts.length} results found
                  </p>
                )}
              </div>
  
              {/* POSTS */}
              <div className="flex flex-col gap-16">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <article key={post.slug} className="group">
  
                      {/* IMAGE */}
                      {post.featuredImageUrl ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="mb-6 block overflow-hidden rounded-2xl bg-[#F3F4F6] shadow-sm ring-1 ring-gray-900/10"
                        >
                          <Image
                            src={post.featuredImageUrl}
                            alt={post.title}
                            width={1400}
                            height={900}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                            className="mx-auto h-auto w-full max-h-[min(70vh,640px)] object-contain transition duration-300 group-hover:opacity-95"
                          />
                        </Link>
                      ) : (
                        <div className="mb-6 flex h-48 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                          No Image Available
                        </div>
                      )}
  
                      {/* CONTENT */}
                      <div className="space-y-4">
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
              </div>
  
            </main>
  
            {/* ================= SIDEBAR ================= */}
            <aside className="space-y-10 lg:pl-4">
  
              {/* SEARCH */}
              <form action="/blog" method="GET" className="relative">
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
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-gray-900/5">
                        {rp.featuredImageUrl ? (
                          <Image
                            src={rp.featuredImageUrl}
                            alt={rp.title}
                            fill
                            className="object-contain p-0.5 transition group-hover:opacity-90"
                            sizes="96px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
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