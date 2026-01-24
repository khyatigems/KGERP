/*
  Warnings:

  - You are about to drop the `Media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Media";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "sku_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gstin" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "upi_enabled" BOOLEAN NOT NULL DEFAULT false,
    "upi_id" TEXT,
    "upi_payee_name" TEXT,
    "upi_qr_url" TEXT,
    "bank_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bank_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "account_holder" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "sku_media_sku_id_idx" ON "sku_media"("sku_id");
