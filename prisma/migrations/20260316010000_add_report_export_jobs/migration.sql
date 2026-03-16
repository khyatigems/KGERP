CREATE TABLE "ReportExportJob" (
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

CREATE INDEX "ReportExportJob_reportType_idx" ON "ReportExportJob"("reportType");
CREATE INDEX "ReportExportJob_status_idx" ON "ReportExportJob"("status");
CREATE INDEX "ReportExportJob_createdAt_idx" ON "ReportExportJob"("createdAt");
CREATE INDEX "ReportExportJob_requestedById_idx" ON "ReportExportJob"("requestedById");
