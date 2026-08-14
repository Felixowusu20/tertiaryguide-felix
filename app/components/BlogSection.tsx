"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, User } from "lucide-react";
import { BlogAdLabel } from "@/app/components/BlogAdLabel";

const HOMEPAGE_BLOG_LIMIT = 6;

type BlogPost = {
  id: string | number;
  title: string;
  excerpt: string;
  date: string;
  featuredImageUrl?: string | null;
  slug?: string;
  isAd?: boolean;
};

export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/blog-posts?limit=${HOMEPAGE_BLOG_LIMIT}`,
        );
        const data = await res.json();
        if (cancelled || !res.ok || !Array.isArray(data.posts)) return;
        setPosts(data.posts);
        setHasMore(data.hasMore === true);
      } catch {
        /* home section stays empty on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatDate(raw: string): string {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 px-5 md:px-10">
          <h2 className="text-xl font-semibold tracking-tight text-[#252525] md:text-2xl">
            Recent on the blog
          </h2>
          <p className="mt-1 text-sm text-[#666]">
            Insights, guides and updates to support your academic journey.
          </p>
        </div>

        {/* Grid */}
        <div className="px-5 md:px-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">

            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block h-full"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white transition-shadow hover:shadow-md">

                  {/* Image */}
                  <div className="relative aspect-[16/10] w-full bg-[#F3F4F6]">
                    {post.featuredImageUrl ? (
                      <Image
                        src={post.featuredImageUrl}
                        alt={post.title}
                        fill
                        className="object-contain p-1"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col px-4 py-4 sm:px-3 sm:py-3">

                    {/* Title */}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#1E1E1E] sm:text-sm md:text-base">
                      {post.isAd && (
                        <span className="mr-1.5 inline-block align-[-0.15em]">
                          <BlogAdLabel />
                        </span>
                      )}
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#666] sm:mt-1.5 sm:text-[12px] md:text-sm">
                      {post.excerpt.replace(/<[^>]*>/g, "")}
                    </p>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F1F1] text-[#555]">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="truncate text-xs font-medium text-[#444]">
                          Admin
                        </span>
                      </div>

                      <span className="shrink-0 text-xs text-[#999]">
                        {formatDate(post.date)}
                      </span>
                    </div>

                  </div>
                </article>
              </Link>
            ))}

          </div>
        </div>

        {/* Browse all */}
        {hasMore && (
          <div className="mt-8 px-5 md:px-10">
            <Link
              href="/blog"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/5 px-5 py-3 text-sm font-semibold text-[#007AFF] transition-colors hover:bg-[#007AFF]/10 sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent"
            >
              Browse all posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
