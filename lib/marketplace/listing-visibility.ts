import { Prisma } from "@prisma/client";

type VisibilityDb = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;

// Older installations receive the same additive table as the migration on first use.
const schemaPromises = new WeakMap<VisibilityDb, Promise<unknown>>();
export async function ensureListingVisibilitySchema(db: VisibilityDb) {
  let promise = schemaPromises.get(db);
  if (!promise) {
    promise = db.$executeRaw`CREATE TABLE IF NOT EXISTS "MarketplaceListingExclusion" (
      "inventoryId" TEXT NOT NULL,
      "shopId" TEXT NOT NULL,
      "marketplace" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("shopId", "marketplace", "inventoryId"),
      FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("shopId") REFERENCES "MarketplaceShop"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`.catch((error) => {
      schemaPromises.delete(db);
      throw error;
    });
    schemaPromises.set(db, promise);
  }
  await promise;
}

export async function hiddenListingInventoryIds(db: VisibilityDb, shopId: string, marketplace: string) {
  await ensureListingVisibilitySchema(db);
  const rows = await db.$queryRaw<Array<{ inventoryId: string }>>`
    SELECT "inventoryId" FROM "MarketplaceListingExclusion"
    WHERE "shopId" = ${shopId} AND "marketplace" = ${marketplace}`;
  return rows.map((row) => row.inventoryId);
}

export async function setListingItemHidden(db: VisibilityDb, input: {
  inventoryId: string; shopId: string; marketplace: string; hidden: boolean;
}) {
  await ensureListingVisibilitySchema(db);
  if (input.hidden) {
    await db.$executeRaw`INSERT OR IGNORE INTO "MarketplaceListingExclusion" ("inventoryId", "shopId", "marketplace")
      VALUES (${input.inventoryId}, ${input.shopId}, ${input.marketplace})`;
  } else {
    await db.$executeRaw`DELETE FROM "MarketplaceListingExclusion"
      WHERE "inventoryId" = ${input.inventoryId} AND "shopId" = ${input.shopId} AND "marketplace" = ${input.marketplace}`;
  }
}
