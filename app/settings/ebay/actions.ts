"use server";

import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  getEbaySettings,
  updateEbaySettings,
  deleteCategoryImages,
  type EbaySettingsData,
} from "@/lib/ebay-settings-server";

/**
 * Get eBay settings (for UI display)
 */
export async function getEbaySettingsAction() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check permission (you might want to add a specific permission for this)
  try {
    const result = await getEbaySettings();
    if (result.success && result.data) {
      return {
        success: true,
        data: {
          id: result.data.id,
          globalBannerImages: result.data.globalBannerImages
            ? JSON.parse(result.data.globalBannerImages)
            : [],
          categoryImageUrls: result.data.categoryImageUrls
            ? JSON.parse(result.data.categoryImageUrls)
            : {},
          categoryGemtypeImageUrls: result.data.categoryGemtypeImageUrls
            ? JSON.parse(result.data.categoryGemtypeImageUrls)
            : {},
          maxImagesPerCategory: result.data.maxImagesPerCategory || 4,
          imagesPerDescription: result.data.imagesPerDescription || 2,
          imageRotationMode: result.data.imageRotationMode || "SEQUENTIAL",
          brandLogoUrl: result.data.brandLogoUrl,
          companyName: result.data.companyName,
          tagline: result.data.tagline,
        },
      };
    }
    return result;
  } catch (error) {
    console.error("[getEbaySettingsAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update eBay settings (global images, company info, rotation mode)
 */
export async function updateEbaySettingsAction(data: {
  globalBannerImages?: string[];
  categoryImageUrls?: Record<string, string[]>;
  categoryGemtypeImageUrls?: Record<string, string[]>;
  maxImagesPerCategory?: number;
  imagesPerDescription?: number;
  imageRotationMode?: string;
  brandLogoUrl?: string;
  companyName?: string;
  tagline?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await updateEbaySettings(data as EbaySettingsData);
    
    if (result.success) {
      revalidatePath("/settings/ebay-settings");
      revalidatePath("/erp/settings/ebay-settings");
    }

    return result;
  } catch (error) {
    console.error("[updateEbaySettingsAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update category-specific images
 */
export async function updateCategoryImagesAction(
  category: string,
  imageUrls: string[]
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await getEbaySettings();
    if (!result.success || !result.data) {
      return { success: false, error: "Could not fetch current settings" };
    }

    const categoryMap = result.data.categoryImageUrls
      ? JSON.parse(result.data.categoryImageUrls)
      : {};

    categoryMap[category] = imageUrls.filter((url) => url.trim().length > 0);

    const updateResult = await updateEbaySettings({
      categoryImageUrls: categoryMap,
    });

    if (updateResult.success) {
      revalidatePath("/settings/ebay-settings");
      revalidatePath("/erp/settings/ebay-settings");
    }

    return updateResult;
  } catch (error) {
    console.error("[updateCategoryImagesAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete category images
 */
export async function deleteCategoryImagesAction(category: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await deleteCategoryImages(category);

    if (result.success) {
      revalidatePath("/settings/ebay-settings");
      revalidatePath("/erp/settings/ebay-settings");
    }

    return result;
  } catch (error) {
    console.error("[deleteCategoryImagesAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
