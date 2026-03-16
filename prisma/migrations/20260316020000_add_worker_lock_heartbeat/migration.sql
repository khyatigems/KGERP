CREATE TABLE "WorkerLockHeartbeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "leaseUntil" DATETIME NOT NULL,
    "heartbeatAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "WorkerLockHeartbeat_leaseUntil_idx" ON "WorkerLockHeartbeat"("leaseUntil");
CREATE INDEX "WorkerLockHeartbeat_ownerId_idx" ON "WorkerLockHeartbeat"("ownerId");
