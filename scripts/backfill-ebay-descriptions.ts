import { config as loadEnv } from "dotenv";
import { buildEbayHtmlDescription } from "../lib/ebay-description";
import { prisma } from "../lib/prisma";
import { getEbaySettings } from "../lib/ebay-settings-server";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const rawDatabaseUrl = process.env.DATABASE_URL ?? "";
if (rawDatabaseUrl.startsWith("libsql://") && !process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL = rawDatabaseUrl;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

type InventoryRow = {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  gemType: string | null;
  color: string | null;
  weightValue: number | null;
  weightUnit: string | null;
  dimensionsMm: string | null;
  treatment: string | null;
  origin: string | null;
  transparency: string | null;
  certification: string | null;
  braceletType: string | null;
  beadSizeMm: number | null;
  beadCount: number | null;
  holeSizeMm: number | null;
  innerCircumferenceMm: number | null;
  standardSize: string | null;
  notes: string | null;
  description: string | null;
  categoryCode?: { name?: string | null } | null;
  gemstoneCode?: { name?: string | null } | null;
  colorCode?: { name?: string | null } | null;
};

function normalizeValue(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeCategoryImageUrls(settings: any): Record<string, string[]> {
  if (!settings) return {};
  if (settings.categoryImageUrls && typeof settings.categoryImageUrls === "string") {
    try {
      return JSON.parse(settings.categoryImageUrls) as Record<string, string[]>;
    } catch {
      return {};
    }
  }
  return settings.categoryImageUrls && typeof settings.categoryImageUrls === "object"
    ? settings.categoryImageUrls
    : {};
}

function normalizeCategoryGemtypeImageUrls(settings: any): Record<string, string[]> {
  if (!settings) return {};
  if (settings.categoryGemtypeImageUrls && typeof settings.categoryGemtypeImageUrls === "string") {
    try {
      return JSON.parse(settings.categoryGemtypeImageUrls) as Record<string, string[]>;
    } catch {
      return {};
    }
  }
  return settings.categoryGemtypeImageUrls && typeof settings.categoryGemtypeImageUrls === "object"
    ? settings.categoryGemtypeImageUrls
    : {};
}

function normalizeGlobalBannerImages(settings: any): string[] | undefined {
  if (!settings) return undefined;
  if (settings.globalBannerImages && typeof settings.globalBannerImages === "string") {
    try {
      return JSON.parse(settings.globalBannerImages) as string[];
    } catch {
      return undefined;
    }
  }
  return Array.isArray(settings.globalBannerImages) ? settings.globalBannerImages : undefined;
}

async function main() {
  const settingsResult = await getEbaySettings();
  const settings = settingsResult.success ? settingsResult.data : null;
  const categoryImageUrls = normalizeCategoryImageUrls(settings);
  const categoryGemtypeImageUrls = normalizeCategoryGemtypeImageUrls(settings);
  const globalBannerImages = normalizeGlobalBannerImages(settings);

  const inventories = (await prisma.inventory.findMany({
    include: {
      categoryCode: { select: { name: true } },
      gemstoneCode: { select: { name: true } },
      colorCode: { select: { name: true } },
    },
  })) as InventoryRow[];

  const itemsToUpdate = inventories.filter((item) => !item.description?.trim());

  console.log(`Found ${inventories.length} inventory records`);
  console.log(`Items needing eBay description: ${itemsToUpdate.length}`);

  let updated = 0;
  let skipped = 0;

  for (const item of itemsToUpdate) {
    const category = normalizeValue(item.categoryCode?.name) || item.category;
    const gemType = normalizeValue(item.gemstoneCode?.name) || item.gemType;

    const html = buildEbayHtmlDescription(
      {
        sku: item.sku,
        itemName: item.itemName,
        category: category,
        gemType: gemType,
        color: normalizeValue(item.colorCode?.name) || item.color,
        shape: null,
        weightValue: item.weightValue,
        weightUnit: item.weightUnit,
        dimensionsMm: item.dimensionsMm,
        treatment: item.treatment,
        origin: item.origin,
        transparency: item.transparency,
        certification: item.certification,
        braceletType: item.braceletType,
        beadSizeMm: item.beadSizeMm,
        beadCount: item.beadCount,
        holeSizeMm: item.holeSizeMm,
        innerCircumferenceMm: item.innerCircumferenceMm,
        standardSize: item.standardSize,
        notes: item.notes,
      },
      {
        settings: {
          companyName: settings?.companyName ?? undefined,
          tagline: settings?.tagline ?? undefined,
          brandLogoUrl: settings?.brandLogoUrl ?? undefined,
          globalBannerImages,
          categoryImageUrls,
          categoryGemtypeImageUrls,
        },
      }
    );

    try {
      await prisma.inventory.update({
        where: { id: item.id },
        data: { description: html },
      });
      updated += 1;
      console.log(`Updated ${item.sku} (${item.itemName})`);
    } catch (error) {
      skipped += 1;
      console.error(`Failed to update ${item.sku}:`, error);
    }
  }

  console.log(`Completed backfill. Updated: ${updated}, Failed: ${skipped}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
