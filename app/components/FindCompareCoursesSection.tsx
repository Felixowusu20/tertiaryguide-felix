"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { programmeCompareHref } from "@/lib/school-links";

export function FindCompareCoursesSection() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    {
      id: string;
      name: string;
      cutoff: string | null;
      source?: "catalog" | "partner";
      school: {
        id?: string;
        name: string;
        alias: string | null;
        slug?: string | null;
        isPartner?: boolean;
        isVerified?: boolean;
      } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = search.trim();
  const showSuggestions = trimmed.length > 0;

  useEffect(() => {
    if (!showSuggestions) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ query: trimmed });
        const res = await fetch(`/api/programmes/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to search programmes");
        }
        if (!cancelled) {
          setResults(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not search programmes. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmed, showSuggestions]);

  return (
    <section className="bg-[#007AFF] py-10 text-center text-white md:py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 md:px-10">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Find &amp; Compare Programmes
        </h2>
        <p className="mt-2 text-sm text-white/80 md:text-base">
          Discover, compare &amp; apply conveniently with TertiaryGuide.
        </p>

        <form
          className="mt-6 flex w-full max-w-3xl flex-col rounded-2xl bg-white/10 p-1 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            const innerTrimmed = search.trim();
            if (!innerTrimmed) return;
            router.push(`/program-search?query=${encodeURIComponent(innerTrimmed)}`);
          }}
        >
          <div className="flex w-full items-center gap-2 rounded-2xl bg-white px-4 py-3 text-left text-xs text-[#6B7280] shadow-sm md:text-sm">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#D1D5DB] text-[10px] text-[#9CA3AF]">
              /
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find, courses and compare"
              className="h-5 w-full border-none bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF] md:text-sm"
            />
          </div>

          {showSuggestions && (
            <div className="mt-1 w-full rounded-2xl bg-white/95 text-left text-xs text-[#1E1E1E] shadow-sm backdrop-blur md:text-sm">
              <div className="space-y-3 border-t border-[#E0E0E0] px-4 py-3">
                {loading ? (
                  <p className="text-[11px] text-[#6B7280]">
                    Searching programmes...
                  </p>
                ) : error ? (
                  <p className="text-[11px] text-[#DC2626]">{error}</p>
                ) : results.length === 0 ? (
                  <p className="text-[11px] text-[#6B7280]">
                    No programmes found. Try a different keyword.
                  </p>
                ) : (
                  <>
                    {results.map((item, index) => {
                      const href = programmeCompareHref(item);

                      return (
                      <Link
                        key={`${item.source || "catalog"}-${item.id}`}
                        href={href}
                        className={
                          "block space-y-1" +
                          (index < results.length - 1
                            ? " border-b border-[#E0E0E0] pb-3"
                            : " pb-1")
                        }
                      >
                        <p className="text-xs font-semibold md:text-sm">
                          {item.name}
                        </p>
                        {item.school && (
                          <p className="text-[11px] text-[#555555] md:text-xs">
                            {item.school.name}
                            {item.school.alias
                              ? ` (${item.school.alias})`
                              : ""}
                            {item.school.isVerified && (
                              <BadgeCheck className="ml-1 inline h-3 w-3 text-[#007AFF]" fill="currentColor" stroke="white" />
                            )}
                          </p>
                        )}
                        {item.cutoff && (
                          <p className="text-[11px] text-[#6B7280]">
                            Cut-off: {item.cutoff}
                          </p>
                        )}
                      </Link>
                      );
                    })}

                    {/* Proceed to Buy Forms - appears after results */}
                    <div className="mt-4 pt-3 border-t border-[#E0E0E0]">
                      <Link
                        href="/university-forms"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2"
                      >
                        Proceed to Buy Forms
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
