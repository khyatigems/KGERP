CREATE TABLE IF NOT EXISTS "WeeklyReportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL,
    "scheduledFor" DATETIME,
    "configHash" TEXT NOT NULL,
    "settingsJson" TEXT NOT NULL,
    "metricsJson" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'PENDING',
    "pdfBase64" TEXT,
    "pdfChecksum" TEXT,
    "pdfBytes" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseUntil" DATETIME,
    "nextAttemptAt" DATETIME,
    "requestedById" TEXT,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "WeeklyReportDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "attemptedAt" DATETIME,
    "acceptedAt" DATETIME,
    "nextAttemptAt" DATETIME,
    "providerMessageId" TEXT,
    "emailLogId" TEXT,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReportRun_executionKey_key" ON "WeeklyReportRun"("executionKey");

CREATE INDEX IF NOT EXISTS "WeeklyReportRun_status_nextAttemptAt_idx" ON "WeeklyReportRun"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "WeeklyReportRun_periodStart_periodEnd_idx" ON "WeeklyReportRun"("periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "WeeklyReportRun_createdAt_idx" ON "WeeklyReportRun"("createdAt");

CREATE INDEX IF NOT EXISTS "WeeklyReportDelivery_status_nextAttemptAt_idx" ON "WeeklyReportDelivery"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "WeeklyReportDelivery_runId_idx" ON "WeeklyReportDelivery"("runId");

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReportDelivery_runId_recipient_key" ON "WeeklyReportDelivery"("runId", "recipient");
