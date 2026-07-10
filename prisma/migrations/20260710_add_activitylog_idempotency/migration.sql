-- Migration: Add idempotencyKey to ActivityLog and unique index
BEGIN TRANSACTION;

ALTER TABLE "ActivityLog" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityLog_user_action_idempotency_key_unique" ON "ActivityLog"("userId", "actionType", "idempotencyKey");

COMMIT;
