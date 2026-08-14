"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";

type LocalProgramme = {
  id: string;
  name: string;
  cutoff: string | null;
};

type GlobalSearchResult = {
  id: string;
  name: string;
  cutoff: string | null;
  source: "catalog" | "partner";
  school: {
    id: string;
    name: string;
    alias: string | null;
    slug: string | null;
    isPartner: boolean;
  } | null;
};

type CutoffModalProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolId: string;
  /** "catalog" uses /api/schools/:id/programmes; "partner" uses /api/apply/programmes */
  source: "catalog" | "partner";
};

function schoolHref(result: GlobalSearchResult) {
  const school = result.school;
  if (!school) return null;
  if (school.isPartner && school.slug) {
    return `/apply/school/${encodeURIComponent(school.slug)}`;
  }
  return `/university-forms/${school.id}`;
}

export function CutoffModal({
  isOpen,
  onClose,
  schoolName,
  schoolId,
  source,
}: CutoffModalProps) {
  const [programmes, setProgrammes] = useState<LocalProgramme[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setGlobalResults([]);
      setSearchError(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !schoolId) return;

    let cancelled = false;

    async function loadProgrammes() {
      try {
        setLoadingLocal(true);
        setLocalError(null);
        const url =
          source === "partner"
            ? `/api/apply/programmes?schoolId=${encodeURIComponent(schoolId)}`
            : `/api/schools/${schoolId}/programmes`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load programmes");
        }
        if (!cancelled) {
          const rows: LocalProgramme[] = Array.isArray(data.programmes)
            ? data.programmes.map(
                (p: { id: string; name: string; cutoff?: string | null }) => ({
                  id: p.id,
                  name: p.name,
                  cutoff: p.cutoff ?? null,
                }),
              )
            : [];
          setProgrammes(rows);
        }
      } catch {
        if (!cancelled) {
          setLocalError("Could not load cutoff points. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingLocal(false);
      }
    }

    void loadProgrammes();
    return () => {
      cancelled = true;
    };
  }, [isOpen, schoolId, source]);

  useEffect(() => {
    if (!isOpen || !isSearching) {
      setGlobalResults([]);
      setSearchError(null);
      setLoadingSearch(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        setLoadingSearch(true);
        setSearchError(null);
        const params = new URLSearchParams({ query: trimmedQuery });
        const res = await fetch(`/api/programmes/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to search programmes");
        }
        if (!cancelled) {
          setGlobalResults(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        if (!cancelled) {
          setSearchError("Could not search programmes. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [isOpen, isSearching, trimmedQuery]);

  const filteredLocal = useMemo(() => {
    if (!trimmedQuery) return programmes;
    const q = trimmedQuery.toLowerCase();
    return programmes.filter((p) => p.name.toLowerCase().includes(q));
  }, [programmes, trimmedQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#1E1E1E]">
                Cut-off Points
              </h2>
              <p className="text-sm text-gray-500">{schoolName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a programme across all schools…"
              className="w-full rounded-xl border border-gray-200 bg-[#F9FAFB] py-2.5 pl-10 pr-3 text-sm text-[#1E1E1E] outline-none transition placeholder:text-gray-400 focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-[#007AFF]/15"
              autoFocus
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            {isSearching
              ? "Showing matches across all institutions on TertiaryGuide."
              : "Browse this school’s programmes, or search to compare cut-offs everywhere."}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {isSearching ? (
            loadingSearch ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
              </div>
            ) : searchError ? (
              <div className="py-12 text-center">
                <p className="text-sm text-red-500">{searchError}</p>
              </div>
            ) : globalResults.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500">
                  No programmes matched “{trimmedQuery}”.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-sm font-medium text-[#007AFF]">
                      Programme
                    </th>
                    <th className="hidden pb-3 text-left text-sm font-medium text-[#007AFF] sm:table-cell">
                      School
                    </th>
                    <th className="pb-3 text-right text-sm font-medium text-[#007AFF]">
                      Cut-off
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {globalResults.map((row) => {
                    const href = schoolHref(row);
                    const schoolLabel =
                      row.school?.alias?.trim() || row.school?.name || "—";
                    const isCurrent = row.school?.id === schoolId;

                    return (
                      <tr
                        key={`${row.source}-${row.id}`}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="py-3 pr-3 text-sm text-[#1E1E1E]">
                          <div className="font-medium">{row.name}</div>
                          <div className="mt-0.5 text-xs text-gray-500 sm:hidden">
                            {schoolLabel}
                            {isCurrent ? " · This school" : ""}
                          </div>
                        </td>
                        <td className="hidden py-3 pr-3 text-sm text-[#4B5563] sm:table-cell">
                          {href ? (
                            <Link
                              href={href}
                              onClick={onClose}
                              className="text-[#007AFF] hover:underline"
                            >
                              {schoolLabel}
                            </Link>
                          ) : (
                            schoolLabel
                          )}
                          {isCurrent && (
                            <span className="ml-1.5 rounded-full bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#007AFF]">
                              This school
                            </span>
                          )}
                          {row.school?.isPartner && (
                            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                              Direct apply
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-sm font-medium text-[#1E1E1E]">
                          {row.cutoff || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : loadingLocal ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
            </div>
          ) : localError ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-500">{localError}</p>
            </div>
          ) : filteredLocal.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">
                No programmes available for this school yet.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-sm font-medium text-[#007AFF]">
                    Programme
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-[#007AFF]">
                    Cut-off Point
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocal.map((prog) => (
                  <tr
                    key={prog.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="py-3 text-sm text-[#1E1E1E]">{prog.name}</td>
                    <td className="py-3 text-right text-sm font-medium text-[#1E1E1E]">
                      {prog.cutoff || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
