"use client";

import Link from "next/link";
import Image from "next/image";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";

type SchoolInfo = {
  id: string;
  name: string;
  alias: string | null;
  slug: string | null;
  logoSrc: string | null;
  priceGhs: number | null;
  deadline: string | null;
  isPartner: boolean;
  brandColor?: string | null;
  offersProgramme: boolean;
  programmeId: string | null;
  source: "catalog" | "partner" | null;
  cutoff: string | null;
  preRequisite: string | null;
  durationYears: number | null;
};

type CompareItem = {
  key: string;
  programmeId: string | null;
  source: "catalog" | "partner" | null;
  name: string;
  cutoff: string | null;
  preRequisite: string | null;
  durationYears: number | null;
  offersProgramme: boolean;
  school: SchoolInfo;
};

const ROWS: {
  key: string;
  label: string;
  getValue: (item: CompareItem) => React.ReactNode;
}[] = [
  {
    key: "availability",
    label: "Course availability",
    getValue: (item) => (item.offersProgramme ? "Yes" : "No"),
  },
  {
    key: "deadline",
    label: "Deadline",
    getValue: (item) =>
      item.school.deadline
        ? new Date(item.school.deadline).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—",
  },
  {
    key: "cutoff",
    label: "Cut off point",
    getValue: (item) =>
      item.offersProgramme ? item.cutoff || "—" : "Not offered",
  },
  {
    key: "prereq",
    label: "Prerequisite",
    getValue: (item) =>
      item.offersProgramme ? item.preRequisite || "—" : "—",
  },
  {
    key: "duration",
    label: "Duration",
    getValue: (item) =>
      item.offersProgramme && item.durationYears != null
        ? `${item.durationYears} years`
        : "—",
  },
  {
    key: "price",
    label: "Price of form",
    getValue: (item) =>
      typeof item.school.priceGhs === "number"
        ? `GHS ${item.school.priceGhs.toFixed(2)}`
        : "—",
  },
];

function schoolLabel(school: Pick<SchoolInfo, "name" | "alias">) {
  return school.alias?.trim() || school.name;
}

function itemFromSchool(school: SchoolInfo, programmeName: string): CompareItem {
  return {
    key: school.id,
    programmeId: school.programmeId,
    source: school.source,
    name: programmeName,
    cutoff: school.cutoff,
    preRequisite: school.preRequisite,
    durationYears: school.durationYears,
    offersProgramme: school.offersProgramme,
    school,
  };
}

function getBuyHref(item: CompareItem | undefined) {
  if (!item?.school.id) return "/university-forms";
  if (item.school.isPartner && item.school.slug) {
    return `/apply/school/${encodeURIComponent(item.school.slug)}`;
  }
  return `/university-forms/${item.school.id}`;
}

function ProgramCompareContent() {
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programmeId") ?? "";
  const sourceParam = searchParams.get("source") ?? "";

  const [programmeName, setProgrammeName] = useState("");
  const [allSchools, setAllSchools] = useState<SchoolInfo[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => {
    if (!programmeId) {
      setAllSchools([]);
      setProgrammeName("");
      setError("No programme selected for comparison.");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ programmeId });
        if (sourceParam) params.set("source", sourceParam);
        const res = await fetch(`/api/programmes/compare?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load programme comparison");
        }
        if (cancelled) return;

        const schools: SchoolInfo[] = Array.isArray(data.schools)
          ? data.schools
          : [];
        setProgrammeName(data.programmeName || "");
        setAllSchools(schools);

        const seedId =
          typeof data.seedSchoolId === "string" ? data.seedSchoolId : null;
        const seedExists = schools.some((s) => s.id === seedId);
        const firstOffering = schools.find((s) => s.offersProgramme)?.id;

        setSelectedSchoolIds(
          seedExists && seedId
            ? [seedId]
            : firstOffering
              ? [firstOffering]
              : schools[0]
                ? [schools[0].id]
                : [],
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load programme comparison.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [programmeId, sourceParam]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  const removeFromCompare = useCallback((schoolId: string) => {
    setSelectedSchoolIds((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((id) => id !== schoolId);
    });
  }, []);

  const addSchool = useCallback((schoolId: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev : [...prev, schoolId],
    );
    setPickerOpen(false);
    setPickerQuery("");
  }, []);

  const visibleItems = useMemo(() => {
    return selectedSchoolIds
      .map((id) => allSchools.find((s) => s.id === id))
      .filter((s): s is SchoolInfo => Boolean(s))
      .map((s) => itemFromSchool(s, programmeName));
  }, [allSchools, selectedSchoolIds, programmeName]);

  const pickerSchools = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return allSchools
      .filter((s) => !selectedSchoolIds.includes(s.id))
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          (s.alias || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.offersProgramme !== b.offersProgramme) {
          return a.offersProgramme ? -1 : 1;
        }
        return schoolLabel(a).localeCompare(schoolLabel(b));
      });
  }, [allSchools, selectedSchoolIds, pickerQuery]);

  const canAddMore = selectedSchoolIds.length < allSchools.length;

  const offeringCount = useMemo(
    () => allSchools.filter((s) => s.offersProgramme).length,
    [allSchools],
  );

  const buyHref = useMemo(() => {
    if (visibleItems.length === 1) return getBuyHref(visibleItems[0]);
    return "/university-forms";
  }, [visibleItems]);

  const colTemplate = useMemo(() => {
    const n = Math.max(visibleItems.length, 1);
    return `minmax(4.5rem,6.5rem) repeat(${n}, minmax(8.25rem,1fr))`;
  }, [visibleItems.length]);

  return (
    <main className="mt-6 min-w-0 space-y-6 md:mt-10 md:space-y-8">
      <section className="min-w-0 space-y-5 md:space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
            {programmeName || "Programme Comparison"}
          </h1>
          {!loading && !error && allSchools.length > 0 && (
            <p className="text-sm text-[#6B7280]">
              Comparing{" "}
              <span className="font-medium text-[#1E1E1E]">
                {visibleItems.length}
              </span>{" "}
              of {allSchools.length} institutions
              {offeringCount > 0 && (
                <span className="text-[#9CA3AF]">
                  {" "}
                  · {offeringCount} offer this programme
                </span>
              )}
            </p>
          )}
        </div>

        {loading && (
          <p className="text-sm text-[#6B7280]">Loading comparison…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-[#DC2626]">{error}</p>
        )}

        {!loading && !error && allSchools.length > 0 && (
          <div className="space-y-5">
            {/* Selected schools + Add */}
            <div className="flex flex-wrap items-center gap-2">
              {visibleItems.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] py-1 pl-1.5 pr-1 text-sm font-medium text-[#1E1E1E]"
                >
                  {item.school.logoSrc ? (
                    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white">
                      <Image
                        src={item.school.logoSrc}
                        alt=""
                        fill
                        className="object-contain p-0.5"
                      />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#007AFF]">
                      <Building2 className="h-3 w-3" />
                    </span>
                  )}
                  <span className="max-w-[9rem] truncate sm:max-w-[12rem]">
                    {schoolLabel(item.school)}
                  </span>
                  {selectedSchoolIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFromCompare(item.school.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]"
                      aria-label={`Remove ${schoolLabel(item.school)}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}

              <button
                type="button"
                onClick={() => {
                  setPickerQuery("");
                  setPickerOpen(true);
                }}
                disabled={!canAddMore}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#007AFF] bg-white px-3.5 py-1.5 text-sm font-medium text-[#007AFF] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {visibleItems.length >= 2 && (
              <p className="text-xs text-[#6B7280] md:hidden">
                Schools sit side by side — swipe sideways if needed.
              </p>
            )}

            {/* Side-by-side comparison on all breakpoints */}
            <div className="min-w-0 overflow-x-auto rounded-2xl border border-[#EFEFEF]">
              <div
                style={{
                  minWidth: `max(100%, ${72 + Math.max(visibleItems.length, 1) * 132}px)`,
                }}
              >
                <div
                  className="grid border-b border-[#E5E5E5] bg-[#FAFAFA]"
                  style={{ gridTemplateColumns: colTemplate }}
                >
                  <div className="sticky left-0 z-20 border-r border-[#E5E5E5] bg-[#FAFAFA] px-2 py-3 text-left text-xs font-medium text-[#6B7280] sm:px-4 sm:text-sm">
                    University
                  </div>
                  {visibleItems.map((item) => (
                    <div
                      key={item.key}
                      className="border-l border-[#F0F0F0] px-3 py-3 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {item.school.logoSrc ? (
                          <span className="relative h-8 w-8 overflow-hidden rounded-full bg-white ring-1 ring-[#EEF2F7]">
                            <Image
                              src={item.school.logoSrc}
                              alt=""
                              fill
                              className="object-contain p-0.5"
                            />
                          </span>
                        ) : null}
                        <span className="line-clamp-2 text-xs font-semibold text-[#1E1E1E] sm:text-sm">
                          {schoolLabel(item.school)}
                        </span>
                        {selectedSchoolIds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFromCompare(item.school.id)}
                            className="shrink-0 rounded-full p-1 text-[#9CA3AF] hover:bg-[#E5E7EB] hover:text-[#111827]"
                            aria-label={`Remove ${schoolLabel(item.school)}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="grid border-b border-[#F0F0F0] last:border-b-0"
                    style={{ gridTemplateColumns: colTemplate }}
                  >
                    <div className="sticky left-0 z-10 border-r border-[#E5E5E5] bg-white px-2 py-3 text-left text-xs text-[#555555] sm:px-4 sm:py-3.5 sm:text-sm">
                      {row.label}
                    </div>
                    {visibleItems.map((item) => (
                      <div
                        key={`${row.key}-${item.key}`}
                        className="min-w-0 border-l border-[#F0F0F0] px-2 py-3 text-xs text-[#1E1E1E] sm:px-3 sm:py-3.5 sm:text-sm"
                      >
                        <div className="break-words text-center">
                          {row.getValue(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-base font-semibold text-[#1E1E1E]">
                    Ready to buy a form?
                  </p>
                  <p className="text-sm leading-relaxed text-[#6B7280]">
                    {visibleItems.length === 1
                      ? `Continue to ${schoolLabel(visibleItems[0].school)} to purchase and apply.`
                      : "Choose one institution from your comparison, then continue to buy a form."}
                  </p>
                </div>
                <Link
                  href={buyHref}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062CC]"
                >
                  Proceed to Buy Form
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Add school modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-3xl">
            <div className="border-b border-[#F0F0F0] px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">
                    Add institution
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Compare “{programmeName || "this programme"}” across schools
                    on TertiaryGuide.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search schools…"
                  autoFocus
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-[#007AFF]/15"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
              {pickerSchools.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-[#6B7280]">
                  {selectedSchoolIds.length === allSchools.length
                    ? "All institutions are already in your comparison."
                    : "No schools match your search."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {pickerSchools.map((school) => (
                    <li key={school.id}>
                      <button
                        type="button"
                        onClick={() => addSchool(school.id)}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F8FAFC]"
                      >
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EEF2F7] bg-white">
                          {school.logoSrc ? (
                            <Image
                              src={school.logoSrc}
                              alt=""
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-[#007AFF]" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#111827]">
                            {schoolLabel(school)}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#6B7280]">
                            {school.offersProgramme ? (
                              <span className="inline-flex items-center gap-1 text-[#166534]">
                                <Check className="h-3 w-3" />
                                Offers {programmeName || "this programme"}
                              </span>
                            ) : (
                              "Programme not currently listed"
                            )}
                            {school.isPartner ? " · Direct apply" : ""}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-[#007AFF]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProgramComparePage() {
  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6 md:gap-8 md:px-10 md:py-8">
        <Header />

        <Suspense
          fallback={
            <main className="mt-6 space-y-4 md:mt-10">
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                Programme Comparison
              </h1>
              <p className="text-sm text-[#6B7280]">Loading comparison…</p>
            </main>
          }
        >
          <ProgramCompareContent />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
