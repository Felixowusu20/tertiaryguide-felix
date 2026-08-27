import { NextRequest, NextResponse } from "next/server";
import {
  buildAdvertiserReport,
  parseOptionalEmail,
  reportRowsToSheet,
} from "@/lib/ad-analytics";
import { deliverAdvertiserReports } from "@/lib/ad-report-mail";
import * as XLSX from "xlsx";

function parseRange(req: NextRequest) {
  const url = new URL(req.url);
  const toRaw = url.searchParams.get("to");
  const fromRaw = url.searchParams.get("from");
  const to = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw
    ? new Date(fromRaw)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  if (from > to) throw new Error("from must be before to");
  const advertiserEmail = parseOptionalEmail(
    url.searchParams.get("advertiserEmail"),
  );
  return { from, to, advertiserEmail };
}

export async function GET(req: NextRequest) {
  try {
    const range = parseRange(req);
    const report = await buildAdvertiserReport(range);
    const download = new URL(req.url).searchParams.get("download") === "1";
    if (!download) {
      return NextResponse.json({ ok: true, ...report });
    }
    const worksheet = XLSX.utils.json_to_sheet(reportRowsToSheet(report.rows));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    const filename = `tertiaryguide-ad-report-${range.from.toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[admin/ad-reports] GET", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const toDate = body.to ? new Date(String(body.to)) : new Date();
    const fromDate = body.from
      ? new Date(String(body.from))
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const sendAll = body.sendAll === true;
    const single = parseOptionalEmail(body.advertiserEmail);
    if (!sendAll && !single) {
      return NextResponse.json(
        { error: "Choose an advertiser email, or send to all advertisers." },
        { status: 400 },
      );
    }

    const baseReport = await buildAdvertiserReport({
      from: fromDate,
      to: toDate,
    });
    const emails = sendAll
      ? [
          ...new Set(
            baseReport.rows
              .map((row) => row.advertiserEmail.trim().toLowerCase())
              .filter(Boolean),
          ),
        ]
      : [single as string];

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No advertiser emails on campaigns in this range." },
        { status: 400 },
      );
    }

    const result = await deliverAdvertiserReports({
      from: fromDate,
      to: toDate,
      emails,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[admin/ad-reports] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send report" },
      { status: 500 },
    );
  }
}
