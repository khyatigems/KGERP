import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { isAllowedExportReportType, processQueuedExportJobs } from "@/lib/export-job-processor";
import { withFreezeGuard } from "@/lib/governance";
import { ensureReportExportJobSchema } from "@/lib/report-export-job-schema";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureReportExportJobSchema();

  try {
    const queuedCount = await prisma.reportExportJob.count({ where: { status: "QUEUED" } });
    if (queuedCount > 0) {
      await processQueuedExportJobs(Math.min(10, Math.max(1, queuedCount)));
    }
  } catch (error) {
    console.error("Failed to process queued export jobs during refresh", error);
  }

  const limit = Math.min(100, Math.max(5, Number(request.nextUrl.searchParams.get("limit") || 20)));
  const jobs = await prisma.reportExportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return NextResponse.json({ jobs });
}

async function postExportJob(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureReportExportJobSchema();

  const body = (await request.json()) as {
    reportType?: string;
    format?: string;
    dateFrom?: string;
    dateTo?: string;
    filters?: Record<string, unknown>;
  };

  const reportType = String(body.reportType || "").trim();
  const format = String(body.format || "").trim().toLowerCase();
  if (!reportType) return NextResponse.json({ error: "reportType is required" }, { status: 400 });
  if (!isAllowedExportReportType(reportType)) {
    return NextResponse.json({ error: "Unsupported reportType for export queue" }, { status: 400 });
  }
  if (!["csv", "pdf", "xlsx"].includes(format)) {
    return NextResponse.json({ error: "format must be csv, pdf, or xlsx" }, { status: 400 });
  }

  const parsedDateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
  const parsedDateTo = body.dateTo ? new Date(body.dateTo) : null;
  const job = await prisma.reportExportJob.create({
    data: {
      reportType,
      format: format.toUpperCase(),
      dateFrom: parsedDateFrom && Number.isNaN(parsedDateFrom.getTime()) ? null : parsedDateFrom,
      dateTo: parsedDateTo && Number.isNaN(parsedDateTo.getTime()) ? null : parsedDateTo,
      filtersJson: body.filters ? JSON.stringify(body.filters) : null,
      status: "QUEUED",
      requestedById: session.user.id,
      requestedBy: session.user.name || session.user.email || "Unknown",
    }
  });

  try {
    await processQueuedExportJobs(3);
  } catch (error) {
    console.error("Failed to trigger export processor immediately", error);
  }

  return NextResponse.json({ job }, { status: 201 });
}

export const POST = withFreezeGuard("Export job creation", postExportJob);
