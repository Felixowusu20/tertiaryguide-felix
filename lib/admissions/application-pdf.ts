import { jsPDF } from "jspdf";
import { DEFAULT_BRAND_COLOR, normalizeBrandColor } from "@/lib/brand-theme";
import {
  academicYearLabel,
  type ApplicationPrintoutData,
  type ApplicationPrintoutSchool,
  type PrintField,
} from "@/lib/admissions/printout-data";

function hexRgb(hex: string): [number, number, number] {
  const raw = normalizeBrandColor(hex).replace("#", "");
  const n = Number.parseInt(raw, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function fetchImageData(
  url?: string | null,
): Promise<{ data: string; format: "JPEG" | "PNG" } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 32 || buf.byteLength > 6_000_000) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("png") || url.toLowerCase().includes(".png")) {
      return {
        data: `data:image/png;base64,${buf.toString("base64")}`,
        format: "PNG",
      };
    }
    return {
      data: `data:image/jpeg;base64,${buf.toString("base64")}`,
      format: "JPEG",
    };
  } catch {
    return null;
  }
}

export async function buildApplicationSummaryPdf(opts: {
  school: ApplicationPrintoutSchool;
  data: ApplicationPrintoutData;
}): Promise<Buffer> {
  const { school, data } = opts;
  const brand = hexRgb(school.brandColor || DEFAULT_BRAND_COLOR);
  const [logo, photo] = await Promise.all([
    fetchImageData(school.logoSrc),
    fetchImageData(data.photoUrl),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  let y = 14;

  const ensure = (need: number) => {
    if (y + need < pageHeight - 12) return;
    pdf.addPage();
    y = 14;
  };

  if (logo) {
    try {
      pdf.addImage(logo.data, logo.format, left, y, 18, 18);
    } catch {
      // ignore unreadable logos
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(17, 24, 39);
  pdf.text(school.name.toUpperCase(), left + (logo ? 22 : 0), y + 6, {
    maxWidth: 110,
  });
  pdf.setFontSize(10);
  pdf.setTextColor(...brand);
  pdf.text(
    `Online Application Form ${academicYearLabel()} Academic Year ONLY`,
    left + (logo ? 22 : 0),
    y + 12,
    { maxWidth: 110 },
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  const contact = [school.address, school.phone, school.email]
    .filter(Boolean)
    .join("\n");
  if (contact) {
    pdf.text(contact, right, y + 4, { align: "right", maxWidth: 55 });
  }
  pdf.text(
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    right,
    y + 22,
    { align: "right" },
  );

  y = 40;
  pdf.setDrawColor(209, 213, 219);
  pdf.line(left, y, right, y);
  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...brand);
  pdf.text("Keep a copy of this printout for any future enquiry.", pageWidth / 2, y, {
    align: "center",
  });
  y += 8;

  const sectionTitle = (label: string) => {
    ensure(12);
    pdf.setDrawColor(...brand);
    pdf.setFillColor(239, 246, 255);
    pdf.setTextColor(...brand);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    const w = pdf.getTextWidth(label.toUpperCase()) + 6;
    pdf.rect(left, y, w, 6, "S");
    pdf.text(label.toUpperCase(), left + 3, y + 4.2);
    y += 10;
  };

  const fieldGrid = (rows: PrintField[], indentRight = 0) => {
    if (rows.length === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Not provided yet.", left, y);
      y += 7;
      return;
    }
    const colW = (right - left - indentRight) / 2;
    rows.forEach((row, index) => {
      if (index % 2 === 0) ensure(8);
      const col = index % 2;
      const x = left + col * colW;
      const rowY = y;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`${row.label}:`, x, rowY);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      const value = pdf.splitTextToSize(row.value.toUpperCase(), colW - 42);
      pdf.text(value, x + 38, rowY);
      if (col === 1 || index === rows.length - 1) {
        y += Math.max(6, value.length * 4);
      }
    });
    y += 2;
  };

  sectionTitle("Personal information");
  const personalRight = photo ? 38 : 0;
  const personalStart = y;
  fieldGrid(data.personal, personalRight);
  if (photo) {
    try {
      pdf.addImage(photo.data, photo.format, right - 34, personalStart - 2, 32, 40);
    } catch {
      // ignore
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(185, 28, 28);
    pdf.text("Is this your correct passport-size photograph?", right - 34, personalStart + 40, {
      maxWidth: 34,
    });
    y = Math.max(y, personalStart + 48);
  }

  sectionTitle("Guardian / next of kin");
  fieldGrid(data.guardian);

  sectionTitle("Programme choices");
  if (data.programmes.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text("No programme choices on this application yet.", left, y);
    y += 8;
  } else {
    ensure(12 + data.programmes.length * 8);
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(209, 213, 219);
    pdf.rect(left, y, right - left, 7, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...brand);
    pdf.text("Choice", left + 2, y + 4.8);
    pdf.text("Programme", left + 32, y + 4.8);
    pdf.text("Stream", left + 130, y + 4.8);
    y += 7;
    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "normal");
    for (const row of data.programmes) {
      ensure(8);
      pdf.rect(left, y, right - left, 7, "S");
      pdf.text(row.choice, left + 2, y + 4.8);
      pdf.setFont("helvetica", "bold");
      pdf.text((row.programme || "").toUpperCase(), left + 32, y + 4.8, {
        maxWidth: 94,
      });
      pdf.setFont("helvetica", "normal");
      pdf.text((row.stream || "—").toUpperCase(), left + 130, y + 4.8, {
        maxWidth: 40,
      });
      y += 7;
    }
    y += 4;
  }

  sectionTitle("Educational background");
  for (const record of data.educations) {
    if (data.educations.length > 1) sectionTitle(record.heading);
    fieldGrid(record.rows);
  }
  for (const sitting of data.examinations) {
    sectionTitle(sitting.heading);
    fieldGrid(sitting.rows);
    if (sitting.results.length === 0) continue;
    ensure(12 + sitting.results.length * 7);
    pdf.setFillColor(239, 246, 255);
    pdf.rect(left, y, right - left, 7, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...brand);
    pdf.text("Subject", left + 2, y + 4.8);
    pdf.text("Grade", left + 150, y + 4.8);
    y += 7;
    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "normal");
    for (const row of sitting.results) {
      ensure(8);
      pdf.setDrawColor(209, 213, 219);
      pdf.rect(left, y, right - left, 7, "S");
      pdf.text(row.subject, left + 2, y + 4.8, { maxWidth: 140 });
      pdf.setFont("helvetica", "bold");
      pdf.text(row.grade, left + 150, y + 4.8);
      pdf.setFont("helvetica", "normal");
      y += 7;
    }
    y += 4;
  }

  const array = pdf.output("arraybuffer");
  return Buffer.from(array);
}

export function printoutFilename(applicationNumber?: string | null) {
  const number = (applicationNumber || "application").replace(/[^\w.-]+/g, "_");
  return `${number}-application-summary.pdf`;
}
