"use client";

import { Download, ExternalLink, FileText } from "lucide-react";

const LABELS: Record<string, string> = {
  passportPhoto: "Passport photograph",
  resultSlip: "Result slip",
  birthCertificate: "Birth certificate",
};

const KNUST_DOC_ORDER = [
  "passportPhoto",
  "resultSlip",
  "birthCertificate",
] as const;

const KNUST_DOC_ALIASES: Record<string, (typeof KNUST_DOC_ORDER)[number]> = {
  passportPhoto: "passportPhoto",
  passportPhotograph: "passportPhoto",
  photo: "passportPhoto",
  resultSlip: "resultSlip",
  wassceResultSlip: "resultSlip",
  sssceResultSlip: "resultSlip",
  birthCertificate: "birthCertificate",
  birthCert: "birthCertificate",
};

export function listApplicationDocuments(
  documents?: Record<string, string | undefined> | null,
) {
  if (!documents) return [];
  const byKey: Partial<Record<(typeof KNUST_DOC_ORDER)[number], string>> = {};
  for (const [key, url] of Object.entries(documents)) {
    if (typeof url !== "string" || !url.trim()) continue;
    const canonical = KNUST_DOC_ALIASES[key];
    if (!canonical || byKey[canonical]) continue;
    byKey[canonical] = url.trim();
  }
  return KNUST_DOC_ORDER.filter((key) => byKey[key]).map((key) => ({
    key,
    label: LABELS[key],
    url: byKey[key] as string,
  }));
}

export function documentDownloadHref(url: string, filename: string) {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace(
      "/upload/",
      `/upload/fl_attachment:${encodeURIComponent(safe)}/`,
    );
  }
  return url;
}

export function ApplicationDocuments({
  documents,
  applicationNumber,
  title = "Application documents",
  emptyLabel = "No documents uploaded yet.",
}: {
  documents?: Record<string, string | undefined> | null;
  applicationNumber?: string;
  title?: string;
  emptyLabel?: string;
}) {
  const items = listApplicationDocuments(documents);

  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-[#1E1E1E]">{title}</h3>
        <p className="mt-1 text-sm text-[#6B7280]">{emptyLabel}</p>
      </div>
    );
  }

  const prefix = applicationNumber || "application";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#1E1E1E]">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => {
          const filename = `${prefix}-${item.key}`;
          const downloadHref = documentDownloadHref(item.url, filename);
          return (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#E8EEF5] bg-[#F8FAFC] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#007AFF] ring-1 ring-[#E5E7EB]">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-medium text-[#1E1E1E]">
                  {item.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#374151] hover:border-[#007AFF]/30 hover:text-[#007AFF]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
                <a
                  href={downloadHref}
                  download={filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0062CC]"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
