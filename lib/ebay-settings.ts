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
 * Get eBay settings from database
 */
export async function getEbaySettings() {
  try {
    let settings = await prisma.ebaySettings.findFirst();
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.ebaySettings.create({
        data: {
          globalBannerImages: JSON.stringify(DEFAULT_EBAY_IMAGE_URLS),
          companyName: "KhyatiGems",
          tagline: "Precious Gems for your Precious Ones",
          imageRotationMode: "RANDOM",
          maxImagesPerCategory: 4,
          imagesPerDescription: 2,
        },
      });
    }

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("[ebay-settings] Error fetching settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
      timeout: 5000,
    } as any);

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
 * Update eBay settings
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

    let settings = await prisma.ebaySettings.findFirst();

    if (!settings) {
      settings = await prisma.ebaySettings.create({
        data: {
          globalBannerImages: data.globalBannerImages
            ? JSON.stringify(data.globalBannerImages)
            : JSON.stringify(DEFAULT_EBAY_IMAGE_URLS),
          categoryImageUrls: data.categoryImageUrls
            ? JSON.stringify(data.categoryImageUrls)
            : undefined,
          maxImagesPerCategory: data.maxImagesPerCategory ?? 4,
          imagesPerDescription: data.imagesPerDescription ?? 2,
          imageRotationMode: data.imageRotationMode ?? "SEQUENTIAL",
          brandLogoUrl: data.brandLogoUrl,
          companyName: data.companyName ?? "KhyatiGems",
          tagline: data.tagline ?? "Precious Gems for your Precious Ones",
        },
      });
    } else {
      settings = await prisma.ebaySettings.update({
        where: { id: settings.id },
        data: {
          globalBannerImages: data.globalBannerImages
            ? JSON.stringify(data.globalBannerImages)
            : settings.globalBannerImages,
          categoryImageUrls: data.categoryImageUrls
            ? JSON.stringify(data.categoryImageUrls)
            : settings.categoryImageUrls,
          maxImagesPerCategory: data.maxImagesPerCategory ?? settings.maxImagesPerCategory,
          imagesPerDescription: data.imagesPerDescription ?? settings.imagesPerDescription,
          imageRotationMode: data.imageRotationMode ?? settings.imageRotationMode,
          brandLogoUrl: data.brandLogoUrl ?? settings.brandLogoUrl,
          companyName: data.companyName ?? settings.companyName,
          tagline: data.tagline ?? settings.tagline,
        },
      });
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error("[ebay-settings] Error updating settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete category images
 */
export async function deleteCategoryImages(category: string) {
  try {
    const settings = await prisma.ebaySettings.findFirst();
    if (!settings) {
      return { success: false, error: "Settings not found" };
    }

    const categoryMap = parseCategoryImageJson(settings.categoryImageUrls);
    delete categoryMap[category];

    await prisma.ebaySettings.update({
      where: { id: settings.id },
      data: {
        categoryImageUrls: JSON.stringify(categoryMap),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[ebay-settings] Error deleting category images:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
