import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BLOG_PAGE_SIZE = 8;

export { BLOG_PAGE_SIZE };

function blogHref(page: number, q?: string, schoolId?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (schoolId) params.set("schoolId", schoolId);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

function visiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

export function BlogPagination({
  page,
  totalPages,
  total,
  pageSize = BLOG_PAGE_SIZE,
  q,
  schoolId,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  q?: string;
  schoolId?: string;
}) {
  if (totalPages <= 1 || total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const btnClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-[#E8EEF5] bg-white px-3 text-sm font-medium text-[#1E1E1E] transition hover:border-[#007AFF]/30 hover:text-[#007AFF]";
  const disabledClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-3 text-sm font-medium text-[#94A3B8]";

  return (
    <nav
      aria-label="Blog pages"
      className="flex flex-col gap-3 border-t border-[#E8EEF5] pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[#6B7280]">
        Showing{" "}
        <span className="font-medium text-[#1E1E1E]">{from}</span>
        {" – "}
        <span className="font-medium text-[#1E1E1E]">{to}</span>
        {" of "}
        <span className="font-medium text-[#1E1E1E]">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {page <= 1 ? (
          <span className={disabledClass} aria-disabled>
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Previous</span>
          </span>
        ) : (
          <Link href={blogHref(page - 1, q, schoolId)} className={btnClass} prefetch>
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Previous</span>
          </Link>
        )}

        {visiblePages(page, totalPages).map((item, i) =>
          item === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className="px-1.5 text-sm text-[#94A3B8]"
              aria-hidden
            >
              …
            </span>
          ) : item === page ? (
            <span
              key={item}
              aria-current="page"
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#007AFF] px-3 text-sm font-semibold text-white"
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={blogHref(item, q, schoolId)}
              className={btnClass}
              prefetch
            >
              {item}
            </Link>
          ),
        )}

        {page >= totalPages ? (
          <span className={disabledClass} aria-disabled>
            <span className="mr-1 hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link href={blogHref(page + 1, q, schoolId)} className={btnClass} prefetch>
            <span className="mr-1 hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
