import type { MetadataRoute } from "next";
import { getDb } from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/blog", changeFrequency: "daily", priority: 0.9 },
  { path: "/explore", changeFrequency: "daily", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faqs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/program-search", changeFrequency: "weekly", priority: 0.85 },
  { path: "/program-search/compare", changeFrequency: "weekly", priority: 0.7 },
  { path: "/wassce-checker", changeFrequency: "weekly", priority: 0.8 },
  { path: "/university-forms", changeFrequency: "weekly", priority: 0.85 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date().toISOString();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${base}${path === "" ? "" : path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const db = await getDb();
    const nowDate = new Date();
    type PostRow = {
      slug: string;
      updatedAt?: Date;
      publishedAt?: Date;
      createdAt?: Date;
    };

    const docs = await db
      .collection<PostRow>("blogPosts")
      .find(
        { status: { $in: ["Published", "Scheduled"] }, publishedAt: { $lte: nowDate } },
        { projection: { slug: 1, updatedAt: 1, publishedAt: 1, createdAt: 1 } },
      )
      .toArray();

    blogEntries = docs.map((m) => {
      const last = m.updatedAt ?? m.publishedAt ?? m.createdAt ?? new Date();
      return {
        url: `${base}/blog/${m.slug}`,
        lastModified: last,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });
  } catch {
    // DB unavailable (e.g. build without MONGODB_URI): ship static routes only
  }

  return [...staticEntries, ...blogEntries];
}
