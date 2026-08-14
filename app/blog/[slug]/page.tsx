import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "../../../lib/mongodb";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { ShareButtons } from "@/app/components/ShareButtons";
import { BlogAdLabel } from "@/app/components/BlogAdLabel";
import { BlogAdSnippets } from "@/app/components/BlogAdSnippets";
import { getPublicActiveAds } from "@/lib/ads";
import { publicBlogPostFilter } from "@/lib/blog-visibility";
import { Search, ArrowLeft } from "lucide-react";
import ScrollToTop from "../../components/ScrollToTop";
import { CommentsSection } from "../components/CommentsSection";

// --- Tiptap Styles for content rendering ---
import "@/components/tiptap-templates/simple/simple-editor.scss";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

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
}

type RelatedPost = {
  slug: string;
  title: string;
  featuredImageUrl: string | null;
  date: string;
  isAd: boolean;
};

async function fetchPost(slug: string) {
  const db = await getDb();
  const posts = db.collection<BlogPostDoc>("blogPosts");
  const doc = await posts.findOne({ slug });
  if (!doc) return null;

  const publishedDate = doc.publishedAt ?? doc.createdAt;

  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    contentHtml: doc.contentHtml,
    featuredImageUrl: doc.featuredImageUrl ?? null,
    date: publishedDate.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    isAd: doc.isAd === true,
  };
}

async function fetchRelatedPosts(slug: string): Promise<RelatedPost[]> {
  const db = await getDb();
  const posts = db.collection<BlogPostDoc>("blogPosts");

  const now = new Date();

  const filter = await publicBlogPostFilter(db, {
    slug: { $ne: slug },
    status: { $in: ["Published", "Scheduled"] },
    publishedAt: { $lte: now },
  });

  const docs = await posts
    .find(filter, {
      sort: { publishedAt: -1 },
      projection: {
        title: 1,
        slug: 1,
        featuredImageUrl: 1,
        publishedAt: 1,
        createdAt: 1,
        isAd: 1,
      },
    })
    .limit(5)
    .toArray();

  return docs.map((doc) => {
    const d = doc.publishedAt ?? doc.createdAt;
    return {
      slug: doc.slug,
      title: doc.title,
      featuredImageUrl: doc.featuredImageUrl ?? null,
      date: d.toISOString(),
      isAd: doc.isAd === true,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const post = await fetchPost(slug);
  if (!post) {
    return { title: "Blog post not found" };
  }

  const plainExcerpt = post.contentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  const description =
    plainExcerpt ||
    `Read “${post.title}” on the TertiaryGuide blog — guides and updates for your tertiary education journey in Ghana.`;

  const publishedTime = new Date(post.date).toISOString();
  const modifiedTime = new Date(post.updatedAt || post.date).toISOString();
  const primaryShareImage = post.featuredImageUrl
    ? post.featuredImageUrl.startsWith("http")
      ? post.featuredImageUrl
      : absoluteUrl(post.featuredImageUrl)
    : null;
  const openGraphImages = primaryShareImage
    ? [{ url: primaryShareImage, alt: post.title }]
    : [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: post.title,
        },
      ];
  const twitterImage = primaryShareImage ?? "/og-image.jpg";

  return {
    title: {
      absolute: `${post.title} | TertiaryGuide Blog`,
    },
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | TertiaryGuide Blog`,
      description,
      type: "article",
      publishedTime,
      modifiedTime,
      authors: ["TertiaryGuide"],
      url: `/blog/${post.slug}`,
      images: openGraphImages,
      siteName: "TertiaryGuide",
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | TertiaryGuide Blog`,
      description,
      images: [twitterImage],
    },
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await fetchPost(slug);
  if (!post) {
    notFound();
  }

  const [related, promoAds] = await Promise.all([
    fetchRelatedPosts(slug),
    getPublicActiveAds(),
  ]);

  const siteUrl = getSiteUrl();
  const excerptForSchema =
    post.contentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) ||
    `Read “${post.title}” on the TertiaryGuide blog.`;

  const mainEntityOfPage = `${siteUrl}/blog/${post.slug}`;

  // SEO: JSON-LD — BlogPosting with image & snippet for rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": mainEntityOfPage,
    },
    headline: post.title,
    image: post.featuredImageUrl
      ? [absoluteUrl(post.featuredImageUrl)]
      : [`${siteUrl}/og-image.jpg`],
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.updatedAt || post.date).toISOString(),
    author: {
      "@type": "Organization",
      name: "TertiaryGuide",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "TertiaryGuide",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/hero/logoTguide.png`,
      },
    },
    description: excerptForSchema,
  };

  return (
    <div className="min-h-screen bg-white text-[#111827]">

    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  
    {/* NAVBAR */}
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-4 md:px-10 md:py-8">
      <Header />
    </div>
  
    {/* MAIN */}
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_320px]">
  
        {/* ================= MAIN CONTENT ================= */}
        <main className="min-w-0">
  
          {/* Back Button */}
          <div className="mb-8">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#007AFF] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 group-hover:bg-[#007AFF]/10 transition">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
              </div>
              Back to Home
            </Link>
          </div>
  
          {/* Featured Image */}
          {post.featuredImageUrl && (
            <div className="mb-10 overflow-hidden rounded-3xl bg-[#F3F4F6] shadow-md ring-1 ring-gray-900/5">
              <Image
                src={post.featuredImageUrl}
                alt={post.title}
                width={1600}
                height={1000}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
                className="mx-auto h-auto w-full max-h-[min(80vh,820px)] object-contain"
                priority
              />
            </div>
          )}
  
          {/* TITLE SECTION */}
          <div className="mb-10 max-w-3xl">
  
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#007AFF]">
              TertiaryGuide Blog
            </p>
  
            <h1 className="flex flex-wrap items-center gap-2.5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl sm:gap-3">
              {post.isAd && <BlogAdLabel className="self-center" />}
              <span className="min-w-0">{post.title}</span>
            </h1>
  
            <div className="mt-4 h-[3px] w-16 rounded-full bg-[#007AFF]" />
  
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
              <span className="font-medium">By TertiaryGuide</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{formatDate(post.date)}</span>
            </div>
          </div>
  
          {/* 🔥 CONTENT */}
          <article className="prose prose-lg prose-gray max-w-none
            prose-headings:font-bold prose-headings:text-[#111827]
            prose-h2:mt-10 prose-h3:mt-8
            prose-p:leading-8 prose-p:text-[#374151]
            prose-a:text-[#007AFF] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[#111827]
            prose-img:mx-auto prose-img:h-auto prose-img:w-full prose-img:max-h-[min(80vh,900px)] prose-img:rounded-2xl prose-img:bg-[#F3F4F6] prose-img:object-contain prose-img:shadow-md">
  
            <div
              className="tiptap ProseMirror simple-editor !p-0"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </article>
  
          {/* Comments */}
          <div className="mt-16">
            <CommentsSection postId={post.slug} />
          </div>
  
          {/* Footer */}
          <div className="mt-16 border-t border-gray-100 pt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
  
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
  
              <div className="text-sm">
                <p className="font-semibold">TertiaryGuide Team</p>
                <p className="text-gray-500">Editor & Admin</p>
              </div>
            </div>
  
            <ShareButtons
              title={post.title}
              url={absoluteUrl(`/blog/${post.slug}`)}
            />
          </div>
  
        </main>
  
        {/* ================= SIDEBAR ================= */}
        <aside className="space-y-10 lg:pl-6">
  
          {/* Search */}
          <form action="/blog" method="GET" className="relative">
            <input
              type="text"
              name="q"
              placeholder="Search articles..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm focus:border-[#007AFF] outline-none"
            />
            <button className="absolute right-0 top-0 h-full px-4 text-[#007AFF]">
              <Search className="h-5 w-5" />
            </button>
          </form>
  
          {/* Recent */}
          <div>
            <h3 className="mb-6 text-lg font-bold border-l-4 border-[#007AFF] pl-3">
              Recent Posts
            </h3>
  
            <div className="flex flex-col gap-6">
              {related.length > 0 ? (
                related.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/blog/${rel.slug}`}
                    className="group flex gap-4"
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-gray-900/5">
                      {rel.featuredImageUrl ? (
                        <Image
                          src={rel.featuredImageUrl}
                          alt={rel.title}
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
  
                    <div>
                      <h4 className="line-clamp-2 text-sm font-semibold text-[#007AFF] group-hover:underline">
                        {rel.isAd && <BlogAdLabel className="mr-1.5 align-middle" />}
                        {rel.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">By Admin</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent posts found.</p>
              )}
            </div>
          </div>
  
          <BlogAdSnippets ads={promoAds} />
        </aside>
      </div>
    </div>
  
    <ScrollToTop />
    <Footer />
  </div>

  );
}
