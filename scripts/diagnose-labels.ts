import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== Label Print Diagnostic ===\n");

  // Total label print job items
  const labelTotal = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM "LabelPrintJobItem"`
  );
  console.log(`Total LabelPrintJobItem rows: ${labelTotal[0]?.cnt || 0}\n`);

  // Activity log entries for label print
  const logTotal = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM "ActivityLog" WHERE details LIKE '%Label printed%'`
  );
  console.log(`ActivityLog "Label printed" entries: ${logTotal[0]?.cnt || 0}\n`);

  // Check entityId status
  const emptyEntity = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM "ActivityLog" WHERE details LIKE '%Label printed%' AND (entityId = '' OR entityId IS NULL)`
  );
  console.log(`Entries with empty entityId: ${emptyEntity[0]?.cnt || 0}`);

  // Show a few recent label print entries
  const sample = await prisma.$queryRawUnsafe<Array<{ id: string; entityId: string; entityIdentifier: string; details: string; createdAt: string }>>(
    `SELECT id, entityId, entityIdentifier, details, createdAt FROM "ActivityLog" WHERE details LIKE '%Label printed%' ORDER BY createdAt DESC LIMIT 5`
  );
  console.log("\nRecent label print entries:");
  for (const s of sample) {
    console.log(`  entityId: ${s.entityId}, SKU: ${s.entityIdentifier}, details: ${s.details}, date: ${s.createdAt}`);
  }

  // Check distinct SKUs with label prints
  const distinctSkus = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(DISTINCT entityIdentifier) as cnt FROM "ActivityLog" WHERE details LIKE '%Label printed%'`
  );
  console.log(`\nDistinct SKUs with label prints: ${distinctSkus[0]?.cnt || 0}`);

  // Check distinct SKUs from LabelPrintJobItem
  const distinctJobSkus = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(DISTINCT i.sku) as cnt FROM "LabelPrintJobItem" li JOIN "Inventory" i ON i.sku = li.sku`
  );
  console.log(`Distinct SKUs from LabelPrintJobItem: ${distinctJobSkus[0]?.cnt || 0}`);

  console.log("\n=== Diagnostic Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
