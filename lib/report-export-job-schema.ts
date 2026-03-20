import { prisma } from "@/lib/prisma";

let ensured = false;

function isMissingTableError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("no such table") && msg.toLowerCase().includes("reportexportjob");
}

export async function ensureReportExportJobSchema() {
  if (ensured) return;
  try {
    await prisma.reportExportJob.count();
    ensured = true;
    return;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReportExportJob" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "reportType" TEXT NOT NULL,
      "format" TEXT NOT NULL,
      "dateFrom" DATETIME,
      "dateTo" DATETIME,
      "filtersJson" TEXT,
      "status" TEXT NOT NULL DEFAULT 'QUEUED',
      "requestedById" TEXT,
      "requestedBy" TEXT,
      "downloadUrl" TEXT,
      "errorMessage" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReportExportJob_reportType_idx" ON "ReportExportJob"("reportType");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReportExportJob_status_idx" ON "ReportExportJob"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReportExportJob_createdAt_idx" ON "ReportExportJob"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ReportExportJob_requestedById_idx" ON "ReportExportJob"("requestedById");`);

  ensured = true;
}

