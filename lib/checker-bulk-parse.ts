import * as XLSX from "xlsx";

export type ParsedCheckerRow = { serial: string; pin: string };

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_ROWS = 8_000;

function normalizeCell(s: string): string {
  return s
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "");
}

function looksLikeHeaderPair(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return (
    (x.includes("serial") || x === "s/n" || x === "sn") && y.includes("pin")
  );
}

function splitCsvLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split(/\t+/).map((c) => c.trim());
  }
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && (c === "," || c === ";")) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseRowsFromCsvText(text: string): {
  rows: ParsedCheckerRow[];
  droppedDuplicateInFile: number;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], droppedDuplicateInFile: 0 };
  }

  let start = 0;
  const first = splitCsvLine(lines[0]);
  if (first.length >= 2) {
    const a = normalizeCell(first[0]);
    const b = normalizeCell(first[1]);
    if (looksLikeHeaderPair(a, b) || looksLikeHeaderPair(b, a)) {
      start = 1;
    }
  }

  const raw: ParsedCheckerRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    if (parts.length < 2) continue;
    const serial = normalizeCell(parts[0]);
    const pin = normalizeCell(parts[1]);
    if (serial && pin) raw.push({ serial, pin });
  }
  return dedupeBySerial(raw);
}

function parseOldExcelOrXlsx(buffer: Buffer): {
  rows: ParsedCheckerRow[];
  droppedDuplicateInFile: number;
} {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const name = wb.SheetNames[0];
  if (!name) {
    return { rows: [], droppedDuplicateInFile: 0 };
  }
  const sheet = wb.Sheets[name];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];

  if (!matrix.length) {
    return { rows: [], droppedDuplicateInFile: 0 };
  }

  let r0 = 0;
  const a0 = String(matrix[0]?.[0] ?? "")
    .trim()
    .toLowerCase();
  const b0 = String(matrix[0]?.[1] ?? "")
    .trim()
    .toLowerCase();
  if (
    (a0.includes("serial") && b0.includes("pin")) ||
    (b0.includes("serial") && a0.includes("pin"))
  ) {
    r0 = 1;
  }

  const raw: ParsedCheckerRow[] = [];
  for (let i = r0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 2) continue;
    const serial = normalizeCell(String(row[0] ?? ""));
    const pin = normalizeCell(String(row[1] ?? ""));
    if (serial && pin) raw.push({ serial, pin });
  }
  return dedupeBySerial(raw);
}

function dedupeBySerial(rows: ParsedCheckerRow[]): {
  rows: ParsedCheckerRow[];
  droppedDuplicateInFile: number;
} {
  const seen = new Map<string, ParsedCheckerRow>();
  for (const r of rows) {
    if (!seen.has(r.serial)) seen.set(r.serial, r);
  }
  return {
    rows: [...seen.values()],
    droppedDuplicateInFile: Math.max(0, rows.length - seen.size),
  };
}

export function parseRowsFromPlainTextLoose(text: string): {
  rows: ParsedCheckerRow[];
  droppedDuplicateInFile: number;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const raw: ParsedCheckerRow[] = [];

  for (const line of lines) {
    if (/^serial$/i.test(line) && line.length < 20) continue;
    if (/^(pin|p\.?i\.?n\.?)$/i.test(line)) continue;

    const tabParts = line.split(/\t+/).map(normalizeCell).filter(Boolean);
    if (tabParts.length >= 2) {
      if (!/^serial$/i.test(tabParts[0])) {
        raw.push({ serial: tabParts[0], pin: tabParts[1] });
        continue;
      }
    }

    if (/[,;]/.test(line) && !line.includes("\t")) {
      const p = line.split(/[,;]/).map(normalizeCell).filter(Boolean);
      if (p.length >= 2) {
        raw.push({ serial: p[0], pin: p[1] });
        continue;
      }
    }

    const multiSpace = line.split(/\s{2,}|\s+\|\s+/).map(normalizeCell).filter(Boolean);
    if (multiSpace.length >= 2) {
      raw.push({ serial: multiSpace[0], pin: multiSpace[1] });
    }
  }
  return dedupeBySerial(raw);
}

async function parseRowsFromPdfBuffer(
  buffer: Buffer,
): Promise<{ rows: ParsedCheckerRow[]; droppedDuplicateInFile: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    const t = (data.text || "").replace(/\u00a0/g, " ");
    return parseRowsFromPlainTextLoose(t);
  } finally {
    await parser.destroy();
  }
}

function extname(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0) return "";
  return filename.slice(i).toLowerCase();
}

export { MAX_FILE_BYTES, MAX_ROWS };

export type ParsedBulkResult = {
  rows: ParsedCheckerRow[];
  droppedDuplicateInFile: number;
};

export async function parseCheckerBulkFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedBulkResult> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 12 MB).");
  }

  const ext = extname(filename);
  if (ext === ".csv" || ext === ".txt") {
    const text = buffer.toString("utf8");
    return parseRowsFromCsvText(text);
  }

  if (ext === ".xlsx" || ext === ".xls") {
    return parseOldExcelOrXlsx(buffer);
  }

  if (ext === ".pdf") {
    return parseRowsFromPdfBuffer(buffer);
  }

  if (ext === ".tsv") {
    return parseRowsFromCsvText(buffer.toString("utf8"));
  }

  throw new Error("Unsupported file type. Use .csv, .xlsx, .xls, or .pdf.");
}
