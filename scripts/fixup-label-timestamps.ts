import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== Fix Label Print Timestamps ===\n");

  // Get all label print activity log entries with their SKU
  const labelLogs = await prisma.$queryRawUnsafe<
    Array<{ id: string; entityIdentifier: string; createdAt: string }>
  >(
    `SELECT al.id, al.entityIdentifier, al.createdAt
     FROM "ActivityLog" al
     WHERE al.details LIKE '%Label printed%'
     AND al.entityType = 'Inventory'
     ORDER BY al.createdAt ASC`
  );

  // Get the actual print job dates per SKU
  const jobDates = await prisma.$queryRawUnsafe<
    Array<{ sku: string; latestPrint: string }>
  >(
    `SELECT i.sku, MAX(j.createdAt) as latestPrint
     FROM "LabelPrintJobItem" li
     JOIN "LabelPrintJob" j ON j.id = li.jobId
     JOIN "Inventory" i ON i.sku = li.sku
     GROUP BY i.sku`
  );

  const skuDateMap = new Map(jobDates.map((j) => [j.sku, j.latestPrint]));

  let fixCount = 0;
  for (const log of labelLogs) {
    const actualDate = skuDateMap.get(log.entityIdentifier);
    if (actualDate) {
      const logDate = new Date(log.createdAt);
      const actualDateObj = new Date(actualDate);
      // Only fix if dates differ by more than 1 hour
      if (Math.abs(logDate.getTime() - actualDateObj.getTime()) > 3600000) {
        await prisma.$executeRawUnsafe(
          `UPDATE "ActivityLog" SET createdAt = ? WHERE id = ?`,
          actualDate,
          log.id
        );
        fixCount++;
      }
    }
  }

  console.log(`Fixed ${fixCount} label print timestamps.`);
  console.log("\n=== Fix Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fix failed:", e);
    process.exit(1);
  });
