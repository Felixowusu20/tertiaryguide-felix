import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { invalidateCheckersCache } from "../../../../../lib/redis";
import { processPendingWassceOrders } from "../../../../../lib/checkers";
import {
  MAX_FILE_BYTES,
  MAX_ROWS,
  parseCheckerBulkFile,
} from "../../../../../lib/checker-bulk-parse";

type CheckerStatus = "Issued" | "Unissued";

interface CheckerDoc {
  serial: string;
  pin: string;
  status: CheckerStatus;
  issuedTo?: string | null;
  issuedAt?: Date | null;
  createdAt: Date;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Use form field name \"file\"." },
        { status: 400 },
      );
    }

    const name = file.name || "upload";
    const buf = Buffer.from(await file.arrayBuffer());

    if (buf.length === 0) {
      return NextResponse.json({ error: "The file is empty." }, { status: 400 });
    }

    if (buf.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.floor(
            MAX_FILE_BYTES / (1024 * 1024),
          )} MB.`,
        },
        { status: 400 },
      );
    }

    let parseResult: Awaited<ReturnType<typeof parseCheckerBulkFile>>;
    try {
      parseResult = await parseCheckerBulkFile(buf, name);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not read file.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { rows, droppedDuplicateInFile } = parseResult;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No serial/PIN pairs found. Use two columns (Serial, PIN), a header row, or comma/tab-separated values. For PDFs, ensure text is selectable.",
        },
        { status: 400 },
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (${rows.length}). Maximum is ${MAX_ROWS} per upload.` },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection<CheckerDoc>("checkers");
    try {
      await collection.createIndex({ serial: 1 }, { unique: true });
    } catch {
      // index may already exist with different options
    }

    const serials = rows.map((r) => r.serial);
    const found = await collection
      .find({ serial: { $in: serials } }, { projection: { serial: 1 } })
      .toArray();
    const existingSerials = new Set(found.map((d) => d.serial));

    const now = new Date();
    const toInsert: CheckerDoc[] = [];
    for (const r of rows) {
      if (existingSerials.has(r.serial)) continue;
      toInsert.push({
        serial: r.serial,
        pin: r.pin,
        status: "Unissued",
        issuedTo: null,
        issuedAt: null,
        createdAt: now,
      });
    }

    const skippedAlreadyInDatabase = rows.length - toInsert.length;

    if (toInsert.length === 0) {
      await invalidateCheckersCache();
      return NextResponse.json({
        ok: true,
        inserted: 0,
        totalParsed: rows.length,
        droppedDuplicateInFile,
        skippedAlreadyInDatabase,
        message: "All serials in this file are already in the database.",
      });
    }

    let inserted = 0;
    try {
      const res = await collection.insertMany(toInsert, { ordered: false });
      inserted = res.insertedCount;
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "insertedCount" in e &&
        typeof (e as { insertedCount: number }).insertedCount === "number"
      ) {
        inserted = (e as { insertedCount: number }).insertedCount;
      } else {
        throw e;
      }
    }

    await invalidateCheckersCache();
    try {
      await processPendingWassceOrders();
    } catch (err) {
      console.error("[admin/checkers/bulk] processPendingWassceOrders", err);
    }

    return NextResponse.json({
      ok: true,
      inserted,
      totalParsed: rows.length,
      droppedDuplicateInFile,
      skippedAlreadyInDatabase,
    });
  } catch (error) {
    console.error("[admin/checkers/bulk] POST error", error);
    return NextResponse.json(
      { error: "Failed to import checkers" },
      { status: 500 },
    );
  }
}
