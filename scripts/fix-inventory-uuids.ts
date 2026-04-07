// Script to fix inventory item with UUIDs instead of names
// Run with: npx ts-node scripts/fix-inventory-uuids.ts

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const rawDatabaseUrl = process.env.DATABASE_URL ?? "";
if (rawDatabaseUrl.startsWith("libsql://") && !process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL = rawDatabaseUrl;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const { prisma } = await import(new URL("../lib/prisma.ts", import.meta.url).href);

async function fixInventoryItem(inventoryId: string) {
  console.log(`Fixing inventory item: ${inventoryId}`);
  
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      categoryCode: true,
      gemstoneCode: true,
      colorCode: true,
    }
  });

  if (!inventory) {
    console.error(`Inventory item ${inventoryId} not found`);
    return;
  }

  console.log('Current values:');
  console.log(`- category: ${inventory.category}`);
  console.log(`- gemType: ${inventory.gemType}`);
  console.log(`- color: ${inventory.color}`);

  // Get the proper names from related tables
  const categoryName = inventory.categoryCode?.name || inventory.category;
  const gemTypeName = inventory.gemstoneCode?.name || inventory.gemType;
  const colorName = inventory.colorCode?.name || inventory.color;

  console.log('New values to be set:');
  console.log(`- category: ${categoryName}`);
  console.log(`- gemType: ${gemTypeName}`);
  console.log(`- color: ${colorName}`);

  // Update the inventory with proper names
  const updated = await prisma.inventory.update({
    where: { id: inventoryId },
    data: {
      category: categoryName,
      gemType: gemTypeName,
      color: colorName,
    }
  });

  console.log('✅ Fixed inventory item successfully!');
  console.log('Updated values:', {
    category: updated.category,
    gemType: updated.gemType,
    color: updated.color,
  });
}

// Fix the specific inventory item
const INVENTORY_ID = '2b2deb20-9164-4552-b0a9-ed6bd65e8f88';

fixInventoryItem(INVENTORY_ID)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
