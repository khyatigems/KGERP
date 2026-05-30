import { prisma } from "@/lib/prisma";

export const DEFAULT_EBAY_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1779786000796-effa1636a7fb?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1779786410107-f1729039bb01?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

export interface EbaySettingsData {
  globalBannerImages?: string[];
  categoryImageUrls?: Record<string, string[]>;
  maxImagesPerCategory?: number;
  imagesPerDescription?: number;
  imageRotationMode?: "SEQUENTIAL" | "RANDOM" | "FIRST";
  brandLogoUrl?: string;
  companyName?: string;
  tagline?: string;
}

/**
 * Parse JSON safely with fallback
 */
function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get eBay settings from database using raw SQL
 */
export async function getEbaySettings() {
  try {
    // Use raw SQL since Prisma doesn't have the EbaySettings model in its generated client
    const settings = await prisma.$queryRawUnsafe<Array<{
      id: string;
      globalBannerImages: string | null;
      categoryImageUrls: string | null;
      maxImagesPerCategory: number;
      imagesPerDescription: number;
      imageRotationMode: string;
      brandLogoUrl: string | null;
      companyName: string | null;
      tagline: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>>(`SELECT * FROM "EbaySettings" LIMIT 1`);
    
    // If no settings exist, create default ones using raw SQL
    if (!settings || settings.length === 0) {
      const defaultImages = JSON.stringify(DEFAULT_EBAY_IMAGE_URLS);
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "EbaySettings" (
          "id",
          "globalBannerImages",
          "companyName",
          "tagline",
          "imageRotationMode",
          "maxImagesPerCategory",
          "imagesPerDescription",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'default',
          ?,
          'KhyatiGems',
          'Precious Gems for your Precious Ones',
          'RANDOM',
          4,
          2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `, defaultImages);

      const newSettings = await prisma.$queryRawUnsafe<Array<{
        id: string;
        globalBannerImages: string | null;
        categoryImageUrls: string | null;
        maxImagesPerCategory: number;
        imagesPerDescription: number;
        imageRotationMode: string;
        brandLogoUrl: string | null;
        companyName: string | null;
        tagline: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>>(`SELECT * FROM "EbaySettings" LIMIT 1`);

      return {
        success: true,
        data: newSettings?.[0] || null,
      };
    }

    return {
      success: true,
      data: settings[0],
    };
  } catch (error) {
    console.error("[getEbaySettings] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch eBay settings",
    };
  }
}

/**
 * Get category-specific images or fallback to global
 */
export function getCategoryImages(settings: any, category?: string): string[] {
  if (!category) {
    const globalImages = parseJson<string[]>(
      settings?.globalBannerImages,
      DEFAULT_EBAY_IMAGE_URLS
    );
    return globalImages.length > 0 ? globalImages : DEFAULT_EBAY_IMAGE_URLS;
  }

  const categoryMap = parseJson<Record<string, string[]>>(
    settings?.categoryImageUrls,
    {}
  );

  const categoryImages = categoryMap[category] || [];
  if (categoryImages.length > 0) {
    return categoryImages;
  }

  // Fallback to global images
  const globalImages = parseJson<string[]>(
    settings?.globalBannerImages,
    DEFAULT_EBAY_IMAGE_URLS
  );
  return globalImages.length > 0 ? globalImages : DEFAULT_EBAY_IMAGE_URLS;
}

/**
 * Select N images based on rotation mode
 */
export function selectImagesForDescription(
  availableImages: string[],
  count: number = 2,
  mode: string = "SEQUENTIAL"
): string[] {
  if (availableImages.length === 0) {
    return DEFAULT_EBAY_IMAGE_URLS.slice(0, count);
  }

  const actualCount = Math.min(count, availableImages.length);

  if (mode === "RANDOM") {
    const selected: string[] = [];
    const available = [...availableImages];
    for (let i = 0; i < actualCount; i++) {
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available[idx]);
      available.splice(idx, 1);
    }
    return selected;
  }

  if (mode === "FIRST") {
    return availableImages.slice(0, actualCount);
  }

  // Default SEQUENTIAL: just return first N
  return availableImages.slice(0, actualCount);
}

/**
 * Validate image URL
 */
export async function validateImageUrl(
  url: string
): Promise<{ valid: boolean; error?: string }> {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required and must be a string" };
  }

  try {
    // Check if URL is valid format
    new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      // @ts-ignore
      timeout: 5000,
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Image not accessible (HTTP ${response.status})`,
      };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return { valid: false, error: "URL is not an image" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Could not validate URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Parse category image JSON safely
 */
export function parseCategoryImageJson(
  json?: string | null
): Record<string, string[]> {
  return parseJson<Record<string, string[]>>(json, {});
}

/**
 * Get all unique categories from settings
 */
export function getAllConfiguredCategories(settings: any): string[] {
  const categoryMap = parseCategoryImageJson(settings?.categoryImageUrls);
  return Object.keys(categoryMap).sort();
}

/**
 * Get image count for a specific category
 */
export function getCategoryImageCount(
  settings: any,
  category: string
): number {
  const categoryMap = parseCategoryImageJson(settings?.categoryImageUrls);
  return (categoryMap[category] || []).length;
}

/**
 * Update eBay settings using raw SQL
 */
export async function updateEbaySettings(data: EbaySettingsData) {
  try {
    // Validate images if provided
    if (data.globalBannerImages) {
      for (const url of data.globalBannerImages) {
        const validation = await validateImageUrl(url);
        if (!validation.valid) {
          return {
            success: false,
            error: `Global image validation failed: ${validation.error}`,
          };
        }
      }
    }

    if (data.categoryImageUrls) {
      for (const category in data.categoryImageUrls) {
        for (const url of data.categoryImageUrls[category]) {
          const validation = await validateImageUrl(url);
          if (!validation.valid) {
            return {
              success: false,
              error: `${category} image validation failed: ${validation.error}`,
            };
          }
        }
      }
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "EbaySettings" LIMIT 1`
    );

    if (!existing || existing.length === 0) {
      // Create new settings
      const defaultImages = JSON.stringify(data.globalBannerImages || DEFAULT_EBAY_IMAGE_URLS);
      const categoryImages = JSON.stringify(data.categoryImageUrls || {});
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "EbaySettings" (
          "id",
          "globalBannerImages",
          "categoryImageUrls",
          "companyName",
          "tagline",
          "imageRotationMode",
          "maxImagesPerCategory",
          "imagesPerDescription",
          "brandLogoUrl",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'default',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `, defaultImages, categoryImages, data.companyName || "KhyatiGems", data.tagline || "Precious Gems for your Precious Ones", data.imageRotationMode || "RANDOM", data.maxImagesPerCategory || 4, data.imagesPerDescription || 2, data.brandLogoUrl || null);
    } else {
      // Update existing settings
      const updates: string[] = [];
      const values: any[] = [];

      if (data.globalBannerImages !== undefined) {
        updates.push(`"globalBannerImages" = ?`);
        values.push(JSON.stringify(data.globalBannerImages));
      }
      if (data.categoryImageUrls !== undefined) {
        updates.push(`"categoryImageUrls" = ?`);
        values.push(JSON.stringify(data.categoryImageUrls));
      }
      if (data.companyName !== undefined) {
        updates.push(`"companyName" = ?`);
        values.push(data.companyName);
      }
      if (data.tagline !== undefined) {
        updates.push(`"tagline" = ?`);
        values.push(data.tagline);
      }
      if (data.imageRotationMode !== undefined) {
        updates.push(`"imageRotationMode" = ?`);
        values.push(data.imageRotationMode);
      }
      if (data.maxImagesPerCategory !== undefined) {
        updates.push(`"maxImagesPerCategory" = ?`);
        values.push(data.maxImagesPerCategory);
      }
      if (data.imagesPerDescription !== undefined) {
        updates.push(`"imagesPerDescription" = ?`);
        values.push(data.imagesPerDescription);
      }
      if (data.brandLogoUrl !== undefined) {
        updates.push(`"brandLogoUrl" = ?`);
        values.push(data.brandLogoUrl);
      }

      updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);

      const sql = `UPDATE "EbaySettings" SET ${updates.join(", ")} WHERE "id" = 'default'`;
      await prisma.$executeRawUnsafe(sql, ...values);
    }

    // Return updated settings
    const updated = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "EbaySettings" LIMIT 1`
    );

    return { success: true, data: updated?.[0] || null };
  } catch (error) {
    console.error("[updateEbaySettings] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete category images using raw SQL
 */
export async function deleteCategoryImages(category: string) {
  try {
    const existing = await prisma.$queryRawUnsafe<Array<{ categoryImageUrls: string | null }>>(
      `SELECT "categoryImageUrls" FROM "EbaySettings" LIMIT 1`
    );

    if (!existing || existing.length === 0) {
      return {
        success: false,
        error: "No settings found",
      };
    }

    const categoryMap = existing[0].categoryImageUrls ? JSON.parse(existing[0].categoryImageUrls) : {};
    delete categoryMap[category];

    await prisma.$executeRawUnsafe(`
      UPDATE "EbaySettings" 
      SET "categoryImageUrls" = ?, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE "id" = 'default'
    `, JSON.stringify(categoryMap));

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("[deleteCategoryImages] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category images",
    };
  }
}

/**
 * Update category images using raw SQL
 */
export async function updateCategoryImages(category: string, images: string[]) {
  try {
    // Validate images
    const validationResults = await Promise.all(images.map(validateImageUrl));
    const invalidImage = validationResults.find((r) => !r.valid);
    if (invalidImage) {
      return {
        success: false,
        error: invalidImage.error || "Invalid image URL",
      };
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ categoryImageUrls: string | null }>>(
      `SELECT "categoryImageUrls" FROM "EbaySettings" LIMIT 1`
    );

    if (!existing || existing.length === 0) {
      return {
        success: false,
        error: "No settings found",
      };
    }

    const categoryMap = existing[0].categoryImageUrls ? JSON.parse(existing[0].categoryImageUrls) : {};
    categoryMap[category] = images;

    await prisma.$executeRawUnsafe(`
      UPDATE "EbaySettings" 
      SET "categoryImageUrls" = ?, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE "id" = 'default'
    `, JSON.stringify(categoryMap));

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("[updateCategoryImages] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category images",
    };
  }
}
