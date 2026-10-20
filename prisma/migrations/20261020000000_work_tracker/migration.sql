-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "marketplaceListingId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "trackingSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "requestId" TEXT NOT NULL,
    "activeUserId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkInterval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'EXTENSION',
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkTrackerCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkSession_activeUserId_key" ON "WorkSession"("activeUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSession_userId_startedAt_idx" ON "WorkSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSession_platform_startedAt_idx" ON "WorkSession"("platform", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSession_status_idx" ON "WorkSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkSession_userId_requestId_key" ON "WorkSession"("userId", "requestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkInterval_sessionId_startedAt_idx" ON "WorkInterval"("sessionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkTarget_userId_platform_period_key" ON "WorkTarget"("userId", "platform", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkActivityEvent_userId_occurredAt_idx" ON "WorkActivityEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkActivityEvent_sessionId_idx" ON "WorkActivityEvent"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkTrackerCredential_tokenHash_key" ON "WorkTrackerCredential"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkTrackerCredential_userId_idx" ON "WorkTrackerCredential"("userId");
