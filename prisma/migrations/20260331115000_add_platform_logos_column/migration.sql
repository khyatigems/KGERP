-- Add platformLogos column for storing sales platform configuration blobs
ALTER TABLE "InvoiceSettings"
ADD COLUMN "platformLogos" TEXT;
