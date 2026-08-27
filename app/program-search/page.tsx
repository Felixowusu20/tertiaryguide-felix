"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Clock } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { programmeCompareHref } from "@/lib/school-links";

type ProgrammeSearchResult = {
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
  } | null;
};

function ProgramSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProgrammeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("tg_program_search_recent");
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!showResults) {
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
        const params = new URLSearchParams({ query: trimmedQuery });
        const res = await fetch(`/api/programmes/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to search programmes");
        }
        if (!cancelled) {
          setResults(Array.isArray(data.results) ? data.results : []);

          if (typeof window !== "undefined" && trimmedQuery) {
            setRecentSearches((current) => {
              const next = [
                trimmedQuery,
                ...current.filter(
                  (q) => q.toLowerCase() !== trimmedQuery.toLowerCase(),
                ),
              ].slice(0, 6);
              try {
                window.localStorage.setItem(
                  "tg_program_search_recent",
                  JSON.stringify(next),
                );
              } catch {
                // ignore
              }
              return next;
            });
          }
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
  }, [trimmedQuery, showResults]);

  return (
    <main className="space-y-8">
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
          Program Search &amp; Compare
        </h1>

        {/* Search bar + results container */}
        <div className="w-full max-w-xl rounded-2xl bg-[#F5F5F5] text-sm text-[#555555] md:text-base">
          <div className="flex items-center gap-2 px-5 py-3">
            <Search className="h-4 w-4 text-[#9E9E9E]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find, compare programs in different universities"
              className="w-full bg-transparent text-sm text-[#555555] outline-none placeholder:text-[#B0B0B0] md:text-base"
            />
          </div>

          {showResults && (
            <div className="space-y-3 border-t border-[#E0E0E0] px-5 py-4 text-sm text-[#1E1E1E]">
              {loading ? (
                <p className="text-xs text-[#6B7280]">Searching programmes...</p>
              ) : error ? (
                <p className="text-xs text-[#DC2626]">{error}</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-[#6B7280]">
                  No programmes found. Try a different keyword.
                </p>
              ) : (
                results.map((item) => {
                  const href = programmeCompareHref(item);

                  return (
                  <Link
                    key={`${item.source || "catalog"}-${item.id}`}
                    href={href}
                    className="block space-y-1 border-b border-[#E0E0E0] pb-3 last:border-b-0 hover:cursor-pointer"
                  >
                    <p className="text-sm font-semibold">{item.name}</p>
                    {item.school && (
                      <p className="text-xs text-[#555555]">
                        {item.school.name}
                        {item.school.alias ? ` (${item.school.alias})` : ""}
                        {(item.source === "partner" || item.school.isPartner) && (
                          <span className="ml-1 text-[10px] font-medium text-[#007AFF]">
                            · Direct apply
                          </span>
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
                })
              )}
            </div>
          )}
        </div>
        {/* Recent searches */}
        <div className="space-y-2 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-[#9E9E9E]">
            <Clock className="h-3 w-3" />
            <span>Recent Searches</span>
          </div>
          <div className="flex flex-wrap gap-4 text-[#555555]">
            {recentSearches.length > 0 ? (
              recentSearches.slice(0, 3).map((term) => (
                <span key={term}>{term}</span>
              ))
            ) : (
              <>
                <span>Chemistry</span>
                <span>Algorithm Efficiency</span>
                <span>Business Administration</span>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ProgramSearchPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-8 sm:px-6 md:gap-5 md:px-10 md:pb-10">
        <Header />

        <Suspense fallback={null}>
          <ProgramSearchContent />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
