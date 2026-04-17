import { unstable_cache } from "next/cache";

/**
 * Cache configuration for common query patterns
 * Uses Next.js unstable_cache for data caching
 */

// Cache TTLs in seconds
export const CACHE_TTLS = {
  MASTERS: 60 * 5,      // 5 minutes for master data
  INVENTORY: 30,        // 30 seconds for inventory
  DASHBOARD: 30,        // 30 seconds for dashboard KPIs
  REPORTS: 60 * 2,      // 2 minutes for reports
  SETTINGS: 60 * 10,    // 10 minutes for settings
} as const;

/**
 * Cache wrapper for expensive database queries
 * @param fn - The function to cache
 * @param keys - Cache key segments
 * @param ttl - Time to live in seconds
 */
export function cacheQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keys: string[],
  ttl: number = 60,
  tags?: string[]
): T {
  return unstable_cache(fn, keys, {
    revalidate: ttl,
    tags: tags && tags.length ? tags : undefined,
  }) as T;
}

/**
 * Predefined cached queries for master data
 */
export const cachedMasters = {
  getCategories: (prisma: any) =>
    cacheQuery(
      () => prisma.categoryCode.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      ["masters", "categories"],
      CACHE_TTLS.MASTERS,
      ["masters:categories"]
    ),

  getGemstones: (prisma: any) =>
    cacheQuery(
      () => prisma.gemstoneCode.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      ["masters", "gemstones"],
      CACHE_TTLS.MASTERS,
      ["masters:gemstones"]
    ),

  getColors: (prisma: any) =>
    cacheQuery(
      () => prisma.colorCode.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      ["masters", "colors"],
      CACHE_TTLS.MASTERS,
      ["masters:colors"]
    ),

  getVendors: (prisma: any) =>
    cacheQuery(
      () => prisma.vendor.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "vendors"],
      CACHE_TTLS.MASTERS,
      ["masters:vendors"]
    ),

  getCollections: (prisma: any) =>
    cacheQuery(
      () => prisma.collectionCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "collections"],
      CACHE_TTLS.MASTERS,
      ["masters:collections"]
    ),

  getRashis: (prisma: any) =>
    cacheQuery(
      () => prisma.rashiCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "rashis"],
      CACHE_TTLS.MASTERS,
      ["masters:rashis"]
    ),

  getCertificates: (prisma: any) =>
    cacheQuery(
      () => prisma.certificateCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "certificates"],
      CACHE_TTLS.MASTERS,
      ["masters:certificates"]
    ),

  getSettings: (prisma: any) =>
    cacheQuery(
      () => prisma.setting.findMany(),
      ["settings", "all"],
      CACHE_TTLS.SETTINGS,
      ["settings:all"]
    ),
};

/**
 * Revalidate cache tags programmatically
 */
export async function revalidateCache(tags: string[]) {
  const { revalidateTag } = await import("next/cache");
  for (const tag of tags) {
    revalidateTag(tag, "default");
  }
}
