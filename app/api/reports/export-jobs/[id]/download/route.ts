import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCapitalRotationAnalyticsUncached, getInventoryAgingAnalytics, getReportsAnalyticsSummaryUncached } from "@/lib/reports-analytics";
import { ensureReportExportJobSchema } from "@/lib/report-export-job-schema";

function parseFilters(filtersJson: string | null) {
  if (!filtersJson) return {};
  try {
    return JSON.parse(filtersJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, "\"\"")}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

async function buildRows(job: { reportType: string; filtersJson: string | null }) {
  const filters = parseFilters(job.filtersJson);
  if (job.reportType === "inventory-aging") {
    const data = await getInventoryAgingAnalytics({
      bucket: typeof filters.bucket === "string" ? filters.bucket : undefined,
      category: typeof filters.category === "string" ? filters.category : undefined,
      vendor: typeof filters.vendor === "string" ? filters.vendor : undefined,
      status: typeof filters.status === "string" ? filters.status : "IN_STOCK",
      page: 1,
      pageSize: 1000,
    });
    return data.rows.map((row) => ({
      SKU: row.sku,
      Item: row.itemName,
      Category: row.category,
      Vendor: row.vendorName,
      DaysInStock: row.daysInStock,
      AgeBucket: row.ageBucket,
      Status: row.status,
      CostValue: row.purchaseCost,
      SellValue: row.sellingPrice,
    }));
  }

  if (job.reportType === "capital-rotation") {
    const data = await getCapitalRotationAnalyticsUncached();
    return data.byCategory.map((row) => ({
      Category: row.category,
      AvgSellDays: row.avgSellDays.toFixed(2),
      RotationRate: row.rotationRate.toFixed(2),
      AvgProfit: row.avgProfit.toFixed(2),
      SoldItems: row.soldItems,
      PurchaseValue: row.purchaseValue.toFixed(2),
      SellValue: row.sellValue.toFixed(2),
    }));
  }

  const summary = await getReportsAnalyticsSummaryUncached();
  return [{
    SnapshotDate: summary.latestSnapshot?.snapshotDate?.toISOString?.() || "",
    InventoryCount: summary.latestSnapshot?.inventoryCount || 0,
    InventoryValueCost: summary.latestSnapshot?.inventoryValueCost || 0,
    InventoryValueSell: summary.latestSnapshot?.inventoryValueSell || 0,
    CapitalAtRiskCost: summary.capitalAtRisk.costValue || 0,
    CapitalAtRiskSell: summary.capitalAtRisk.sellValue || 0,
  }];
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureReportExportJobSchema();

  const { id } = await params;
  const job = await prisma.reportExportJob.findUnique({
    where: { id },
    select: {
      id: true,
      reportType: true,
      format: true,
      status: true,
      filtersJson: true,
      requestedById: true
    }
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "Job is not completed yet" }, { status: 409 });
  }
  if (job.requestedById && job.requestedById !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await buildRows(job);
  const baseName = `${job.reportType}_${job.id.slice(0, 8)}`;

  if (job.format === "XLSX") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`
      }
    });
  }

  if (job.format === "PDF") {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Report: ${job.reportType}`, 10, 10);
    let y = 18;
    rows.slice(0, 30).forEach((row) => {
      const line = Object.values(row).join(" | ");
      doc.text(String(line).slice(0, 180), 10, y);
      y += 6;
    });
    const buf = doc.output("arraybuffer");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`
      }
    });
  }

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.csv"`
    }
  });
}
