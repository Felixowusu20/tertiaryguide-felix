import { NextRequest, NextResponse } from "next/server";
import { buildAdvertiserReport, parseOptionalEmail } from "@/lib/ad-analytics";
import { deliverAdvertiserReports } from "@/lib/ad-report-mail";

/**
 * Optional automated weekly delivery.
 * POST with header: Authorization: Bearer $CRON_SECRET
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 501 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const report = await buildAdvertiserReport({ from, to });
  const emails = [
    ...new Set(
      report.rows
        .map((row) => parseOptionalEmail(row.advertiserEmail))
        .filter((email): email is string => Boolean(email)),
    ),
  ];
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, advertisers: 0 });
  }
  const result = await deliverAdvertiserReports({ from, to, emails });
  return NextResponse.json({ ok: true, advertisers: emails.length, ...result });
}
