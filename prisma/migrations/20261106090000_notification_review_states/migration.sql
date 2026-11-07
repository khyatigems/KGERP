ALTER TABLE "Notification" ADD COLUMN "acknowledgedAt" DATETIME;
ALTER TABLE "Notification" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "Notification" ADD COLUMN "snoozedUntil" DATETIME;
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");
