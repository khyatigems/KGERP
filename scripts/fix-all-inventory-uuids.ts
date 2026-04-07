// Comprehensive script to fix all inventory items with UUID values in name fields
// and prevent future data integrity issues

import { config as loadEnv } from "dotenv";
import type { Inventory } from "@prisma/client";
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

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type InventoryWithRelations = Inventory & {
  categoryCode?: { id: string; name: string; code: string | null } | null;
  gemstoneCode?: { id: string; name: string; code: string | null } | null;
  colorCode?: { id: string; name: string; code: string | null } | null;
};

function sanitizeCode(code: string | null | undefined, fallback: string): string {
  if (!code) return fallback;
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "") || fallback;
}

async function fixAllCorruptedInventoryItems() {
  console.log('🔍 Scanning for corrupted inventory items...\n');

  // Find all inventory items where category, gemType, or color looks like a UUID
  const inventories: InventoryWithRelations[] = await prisma.inventory.findMany({
    include: {
      categoryCode: { select: { id: true, name: true, code: true } },
      gemstoneCode: { select: { id: true, name: true, code: true } },
      colorCode: { select: { id: true, name: true, code: true } },
    }
  });

  const corruptedItems = inventories.filter(item => 
    UUID_PATTERN.test(item.category) || 
    UUID_PATTERN.test(item.gemType || '') || 
    UUID_PATTERN.test(item.color || '')
  );

  console.log(`Found ${corruptedItems.length} corrupted items\n`);

  for (const item of corruptedItems) {
    console.log(`Fixing: ${item.id} (SKU: ${item.sku})`);
    console.log(`  Current: category=${item.category}, gemType=${item.gemType}, color=${item.color}`);

    let newCategory = item.categoryCode?.name || item.category;
    let newGemType = item.gemstoneCode?.name || item.gemType;
    let newColor = item.colorCode?.name || item.color;

    if ((!newCategory || UUID_PATTERN.test(newCategory)) && item.categoryCodeId) {
      const code = await prisma.categoryCode.findUnique({ where: { id: item.categoryCodeId } });
      if (code?.name) newCategory = code.name;
    }

    if ((!newGemType || UUID_PATTERN.test(newGemType ?? ""))) {
      const lookupId = item.gemstoneCodeId ?? (UUID_PATTERN.test(item.gemType ?? "") ? item.gemType ?? undefined : undefined);
      if (lookupId) {
        const code = await prisma.gemstoneCode.findUnique({ where: { id: lookupId } });
        if (code?.name) newGemType = code.name;
      }
    }

    if ((!newColor || UUID_PATTERN.test(newColor ?? ""))) {
      const lookupId = item.colorCodeId ?? (UUID_PATTERN.test(item.color ?? "") ? item.color ?? undefined : undefined);
      if (lookupId) {
        const code = await prisma.colorCode.findUnique({ where: { id: lookupId } });
        if (code?.name) newColor = code.name;
      }
    }

    console.log(`  New:     category=${newCategory}, gemType=${newGemType}, color=${newColor}`);

    // Prepare SKU prefix fix if possible
    const categoryCodeStr = sanitizeCode(item.categoryCode?.code, "XX");
    const gemstoneCodeStr = sanitizeCode(item.gemstoneCode?.code, "XX");
    const colorCodeStr = sanitizeCode(item.colorCode?.code, "XX");
    const weightStr = (item.weightValue ?? 0).toFixed(2).replace('.', '');
    const existingSuffix = item.sku?.slice(-5) || "00000";
    const newSkuPrefix = `KG${categoryCodeStr}${gemstoneCodeStr}${colorCodeStr}${weightStr}`;
    const recomputedSku = `${newSkuPrefix}${existingSuffix}`;
    const shouldUpdateSku = Boolean(item.sku && item.sku.length >= existingSuffix.length && item.sku !== recomputedSku);

    // Update the record
    await prisma.inventory.update({
      where: { id: item.id },
      data: {
        category: newCategory,
        gemType: newGemType || null,
        color: newColor || null,
        sku: shouldUpdateSku ? recomputedSku : undefined,
      }
    });

    console.log(`  ✅ Fixed\n`);
  }

  console.log(`✅ Fixed ${corruptedItems.length} items total`);
}

// Also create a data validation helper
async function validateDataIntegrity() {
  console.log('\n🔍 Running data integrity validation...\n');

  const inventories = await prisma.inventory.findMany();
  const issues: string[] = [];

  for (const item of inventories) {
    // Check for UUIDs in name fields
    if (UUID_PATTERN.test(item.category)) {
      issues.push(`Item ${item.id}: category contains UUID: ${item.category}`);
    }
    if (UUID_PATTERN.test(item.gemType || '')) {
      issues.push(`Item ${item.id}: gemType contains UUID: ${item.gemType}`);
    }
    if (UUID_PATTERN.test(item.color || '')) {
      issues.push(`Item ${item.id}: color contains UUID: ${item.color}`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ All data integrity checks passed!');
  } else {
    console.log(`⚠️ Found ${issues.length} data integrity issues:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  return issues.length === 0;
}

async function main() {
  // First fix all corrupted items
  await fixAllCorruptedInventoryItems();

  // Then validate
  const isValid = await validateDataIntegrity();

  if (!isValid) {
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
