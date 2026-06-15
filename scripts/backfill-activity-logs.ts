import { prisma } from "../lib/prisma";
import crypto from "crypto";

async function main() {
  console.log("=== Backfill Activity Logs ===\n");

  // 1. Backfill Label Printed events
  console.log("1. Backfilling Label Print events...");
  const labelJobs = await prisma.$queryRawUnsafe<
    Array<{
      jobId: string;
      sku: string;
      inventoryId: string;
      printFormat: string | null;
      userId: string;
      userName: string | null;
      createdAt: string;
    }>
  >(
    `SELECT j.id as jobId, i.sku, i.id as inventoryId, j.printFormat, j.userId, u.name as userName, j.createdAt
     FROM "LabelPrintJobItem" li
     JOIN "LabelPrintJob" j ON j.id = li.jobId
     JOIN "Inventory" i ON i.sku = li.sku
     LEFT JOIN "User" u ON u.id = j.userId
     ORDER BY j.createdAt DESC`
  );

  const seenLabelSkus = new Set<string>();
  let labelCount = 0;

  for (const job of labelJobs) {
    if (seenLabelSkus.has(job.sku)) continue;

    const existing = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*) as cnt FROM "ActivityLog"
       WHERE entityType = 'Inventory'
       AND entityIdentifier = ?
       AND details LIKE '%Label printed%'`,
      job.sku
    );

    if (Number(existing[0]?.cnt || 0) > 0) continue;

    const printFormat = job.printFormat ? JSON.parse(job.printFormat) : {};
    const labelType = printFormat?.pageSize || "Standard";

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ActivityLog" (id, entityType, entityId, entityIdentifier, actionType, userId, userName, source, details, description, createdAt, module, action)
       VALUES (?, 'Inventory', ?, ?, 'EDIT', ?, ?, 'SYSTEM', ?, ?, ?, 'Inventory', 'EDIT')`,
      crypto.randomUUID(),
      job.inventoryId,
      job.sku,
      job.userId || "SYSTEM",
      job.userName || "System",
      `Label printed for this item (${labelType})`,
      `Label printed for this item (${labelType})`,
      job.createdAt
    );

    seenLabelSkus.add(job.sku);
    labelCount++;
  }
  console.log(`   Backfilled ${labelCount} label print events.\n`);

  // 2. Backfill SOLD events
  console.log("2. Backfilling SOLD events...");
  const soldItems = await prisma.$queryRawUnsafe<
    Array<{
      sku: string;
      inventoryId: string;
      saleDate: string;
      customerName: string | null;
      invoiceNumber: string | null;
    }>
  >(
    `SELECT i.sku, i.id as inventoryId, s.saleDate, s.customerName, inv.invoiceNumber
     FROM "Sale" s
     JOIN "Inventory" i ON s.inventoryId = i.id
     LEFT JOIN "Invoice" inv ON s.invoiceId = inv.id
     WHERE i.status = 'SOLD'
     ORDER BY s.saleDate DESC`
  );

  const seenSoldSkus = new Set<string>();
  let soldCount = 0;

  for (const item of soldItems) {
    if (seenSoldSkus.has(item.sku)) continue;

    const existing = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*) as cnt FROM "ActivityLog"
       WHERE entityType = 'Inventory'
       AND entityIdentifier = ?
       AND (actionType = 'STATUS_CHANGE' OR details LIKE '%marked SOLD%')`,
      item.sku
    );

    if (Number(existing[0]?.cnt || 0) > 0) continue;

    const detailMsg = item.invoiceNumber
      ? `Sold on Invoice ${item.invoiceNumber}${item.customerName ? ` to ${item.customerName}` : ""}`
      : `Sold${item.customerName ? ` to ${item.customerName}` : ""}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ActivityLog" (id, entityType, entityId, entityIdentifier, actionType, userId, userName, source, details, description, createdAt, module, action)
       VALUES (?, 'Inventory', ?, ?, 'STATUS_CHANGE', 'SYSTEM', 'System', 'SYSTEM', ?, ?, ?, 'Inventory', 'STATUS_CHANGE')`,
      crypto.randomUUID(),
      item.inventoryId,
      item.sku,
      detailMsg,
      detailMsg,
      item.saleDate
    );

    seenSoldSkus.add(item.sku);
    soldCount++;
  }
  console.log(`   Backfilled ${soldCount} SOLD events.\n`);

  // 3. Summary
  console.log("=== Backfill Complete ===");
  console.log(`Label Print Events Added: ${labelCount}`);
  console.log(`SOLD Events Added:       ${soldCount}`);
  console.log(`Total New Entries:       ${labelCount + soldCount}`);
}

main()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  });
