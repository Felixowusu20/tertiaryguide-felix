import * as XLSX from "xlsx";
import {
  buildAdvertiserReport,
  reportRowsToSheet,
} from "./ad-analytics";
import { sendAdvertiserPerformanceEmail } from "./email";

function dateLabel(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function workbookBuffer(rows: ReturnType<typeof reportRowsToSheet>) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function deliverAdvertiserReports(opts: {
  from: Date;
  to: Date;
  emails: string[];
}): Promise<{ sent: number; failed: string[] }> {
  const fromLabel = dateLabel(opts.from);
  const toLabel = dateLabel(opts.to);
  let sent = 0;
  const failed: string[] = [];

  for (const email of opts.emails) {
    const report = await buildAdvertiserReport({
      from: opts.from,
      to: opts.to,
      advertiserEmail: email,
    });
    if (report.rows.length === 0) continue;
    const filename = `tertiaryguide-ad-report-${email.replace(/[^a-z0-9]+/g, "-")}-${opts.from.toISOString().slice(0, 10)}.xlsx`;
    const buffer = workbookBuffer(reportRowsToSheet(report.rows));
    const advertiserName =
      report.rows.find((row) => row.advertiserName)?.advertiserName || "";
    const summaryHtml = `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Impressions</td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;">${report.totals.impressions}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Views</td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;">${report.totals.views}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Clicks</td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;">${report.totals.clicks}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;">CTR</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;">${report.totals.ctr}%</td>
          </tr>
        </table>`;
    try {
      await sendAdvertiserPerformanceEmail({
        to: email,
        advertiserName,
        fromLabel,
        toLabel,
        summaryHtml,
        xlsxBuffer: buffer,
        filename,
      });
      sent += 1;
    } catch (error) {
      console.error("[deliverAdvertiserReports]", email, error);
      failed.push(email);
    }
  }

  return { sent, failed };
}
