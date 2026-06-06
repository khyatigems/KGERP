"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
import { getEbaySettings } from "@/lib/ebay-settings-server";

interface RegenerateProgress {
  total: number;
  updated: number;
  pending: number;
  startTime: number;
  errors: Array<{ id: string; sku: string; error: string }>;
}

export async function regenerateEbayHtmlDescriptions() {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) {
    return { success: false, error: perm.message };
  }

  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const startTime = Date.now();
    const progress: RegenerateProgress = {
      total: 0,
      updated: 0,
      pending: 0,
      startTime,
      errors: [],
    };

    // Get all inventory items that have basic required data
    const items = await prisma.inventory.findMany({
      select: {
        id: true,
        sku: true,
        itemName: true,
        category: true,
        gemType: true,
        color: true,
        shape: true,
        weightValue: true,
        weightUnit: true,
        dimensionsMm: true,
        treatment: true,
        origin: true,
        transparency: true,
        certification: true,
        braceletType: true,
        beadSizeMm: true,
        beadCount: true,
        holeSizeMm: true,
        innerCircumferenceMm: true,
        standardSize: true,
        notes: true,
      },
    });

    progress.total = items.length;
    progress.pending = items.length;

    // Fetch eBay settings once
    const settingsResult = await getEbaySettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    // Process each item
    const updates: Array<{
      id: string;
      description: string;
    }> = [];

    for (const item of items) {
      try {
        // Prepare data for eBay description builder
        const ebayFields = {
          sku: item.sku,
          itemName: item.itemName,
          category: item.category,
          gemType: item.gemType,
          color: item.color,
          shape: item.shape,
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
        };

        // Get category-specific images if available
        let categoryImages: string[] | undefined;
        let categoryImageUrls: Record<string, string[]> = {};
        let categoryGemtypeImageUrls: Record<string, string[]> = {};
        let globalBannerImages: string[] | undefined;

        if (settings) {
          categoryImageUrls =
            settings.categoryImageUrls && typeof settings.categoryImageUrls === "string"
              ? JSON.parse(settings.categoryImageUrls)
              : settings.categoryImageUrls || {};
          categoryGemtypeImageUrls =
            settings.categoryGemtypeImageUrls && typeof settings.categoryGemtypeImageUrls === "string"
              ? JSON.parse(settings.categoryGemtypeImageUrls)
              : settings.categoryGemtypeImageUrls || {};
          globalBannerImages =
            settings.globalBannerImages && typeof settings.globalBannerImages === "string"
              ? JSON.parse(settings.globalBannerImages)
              : settings.globalBannerImages;
        }

        if (settings && item.category) {
          categoryImages = categoryImageUrls[item.category];
        }

        // Generate HTML description
        const html = buildEbayHtmlDescription(ebayFields, {
          categoryImages,
          settings: {
            companyName: settings?.companyName ?? undefined,
            tagline: settings?.tagline ?? undefined,
            brandLogoUrl: settings?.brandLogoUrl ?? undefined,
            globalBannerImages,
            categoryImageUrls,
            categoryGemtypeImageUrls,
          },
        });

        updates.push({
          id: item.id,
          description: html,
        });

        progress.updated++;
      } catch (error) {
        progress.errors.push({
          id: item.id,
          sku: item.sku,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      progress.pending--;
    }

    // Batch update all items
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.inventory.update({
            where: { id: update.id },
            data: { description: update.description },
          })
        )
      );
    }

    // Revalidate cache
    revalidatePath("/inventory");
    try {
      revalidateTag("inventory:stats", "default");
    } catch {}

    const endTime = Date.now();
    const timeTaken = Math.round((endTime - startTime) / 1000);

    return {
      success: true,
      progress: {
        total: progress.total,
        updated: progress.updated,
        failed: progress.errors.length,
        timeTaken,
      },
      errors: progress.errors.length > 0 ? progress.errors : undefined,
    };
  } catch (error) {
    console.error("[Regenerate eBay HTML] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate eBay HTML descriptions",
    };
  }
}
