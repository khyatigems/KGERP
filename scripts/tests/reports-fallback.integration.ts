import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

async function main() {
  const dbPath = path.join(process.cwd(), "tmp", "reports-fallback-test.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

  const { prisma } = await import("../../lib/prisma");
  const { getReportsAnalyticsSummaryUncached, getInventoryAgingAnalytics, getCapitalRotationAnalyticsUncached } = await import("../../lib/reports-analytics");

  const vendor = await prisma.vendor.create({
    data: {
      name: "Test Vendor",
      phone: "9999999999",
      email: "vendor@example.com",
      address: "Test Address",
      city: "Test City",
      state: "Test State",
      country: "India",
      gstin: "09AAAAA0000A1Z5",
      pan: "AAAAA0000A",
    },
  });

  const invOld = await prisma.inventory.create({
    data: {
      sku: "TESTSKU001",
      itemName: "Test Stone",
      category: "Loose",
      costPrice: 1000,
      sellingPrice: 1500,
      status: "IN_STOCK",
      vendorId: vendor.id,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.inventory.create({
    data: {
      sku: "TESTSKU002",
      itemName: "Test Stone 2",
      category: "Loose",
      costPrice: 2000,
      sellingPrice: 2600,
      status: "IN_STOCK",
      vendorId: vendor.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.sale.create({
    data: {
      inventoryId: invOld.id,
      saleDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      platform: "Manual",
      salePrice: 1800,
      netAmount: 1800,
      costPriceSnapshot: 1000,
      profit: 800,
    },
  });

  const summary = await getReportsAnalyticsSummaryUncached();
  assert(summary.latestSnapshot, "expected latestSnapshot");
  const snapshot = summary.latestSnapshot as unknown as { inventoryCount: number };
  assert(snapshot.inventoryCount >= 2, "expected inventoryCount >= 2");

  const aging = await getInventoryAgingAnalytics({ page: 1, pageSize: 50 });
  assert(aging.total >= 2, "expected inventory aging rows");
  assert(aging.bucketStats.length > 0, "expected aging bucket stats");

  const rotation = await getCapitalRotationAnalyticsUncached();
  assert(rotation.overall.soldItems >= 1, "expected sold items >= 1");
  assert(rotation.byCategory.length >= 1, "expected category rows");

  await prisma.$disconnect();
}

main().catch((error) => {
  process.stderr.write(String(error instanceof Error ? error.stack || error.message : error));
  process.exit(1);
});
