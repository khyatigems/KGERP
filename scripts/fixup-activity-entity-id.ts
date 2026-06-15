import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== Fixup: Backfill empty entityId in Activity Logs ===\n");

  // 1. Fix label print entries (empty entityId)
  const labelEntries = await prisma.$queryRawUnsafe<
    Array<{ id: string; entityIdentifier: string }>
  >(
    `SELECT al.id, al.entityIdentifier
     FROM "ActivityLog" al
     WHERE al.entityType = 'Inventory'
     AND (al.entityId = '' OR al.entityId IS NULL)
     AND al.details LIKE '%Label printed%'`
  );

  const skuToId = new Map<string, string>();
  for (const entry of labelEntries) {
    if (!skuToId.has(entry.entityIdentifier)) {
      const inv = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "Inventory" WHERE sku = ? LIMIT 1`,
        entry.entityIdentifier
      );
      if (inv[0]) skuToId.set(entry.entityIdentifier, inv[0].id);
    }
  }

  let fixCount = 0;
  for (const [sku, invId] of skuToId) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ActivityLog" SET entityId = ? WHERE entityType = 'Inventory' AND (entityId = '' OR entityId IS NULL) AND entityIdentifier = ? AND details LIKE '%Label printed%'`,
      invId,
      sku
    );
    fixCount++;
  }
  console.log(`   Fixed ${fixCount} label print entries.\n`);

  // 2. Fix any other entries with empty entityId
  const otherEntries = await prisma.$queryRawUnsafe<
    Array<{ id: string; entityIdentifier: string }>
  >(
    `SELECT al.id, al.entityIdentifier
     FROM "ActivityLog" al
     WHERE al.entityType = 'Inventory'
     AND (al.entityId = '' OR al.entityId IS NULL)
     AND al.details NOT LIKE '%Label printed%'`
  );

  if (otherEntries.length > 0) {
    const skuMap = new Map<string, string>();
    for (const entry of otherEntries) {
      if (!skuMap.has(entry.entityIdentifier)) {
        const inv = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "Inventory" WHERE sku = ? LIMIT 1`,
          entry.entityIdentifier
        );
        if (inv[0]) skuMap.set(entry.entityIdentifier, inv[0].id);
      }
    }

    let otherFixCount = 0;
    for (const [sku, invId] of skuMap) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ActivityLog" SET entityId = ? WHERE entityType = 'Inventory' AND (entityId = '' OR entityId IS NULL) AND entityIdentifier = ?`,
        invId,
        sku
      );
      otherFixCount++;
    }
    console.log(`   Fixed ${otherFixCount} other entries.\n`);
  } else {
    console.log("   No other entries to fix.\n");
  }

  console.log("=== Fixup Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fixup failed:", e);
    process.exit(1);
  });
