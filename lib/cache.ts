import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";

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
export function cacheQuery<T>(
  fn: () => Promise<T>,
  keys: string[],
  ttl: number = 60,
  tags?: string[]
): () => Promise<T> {
  return unstable_cache(fn, keys, {
    revalidate: ttl,
    tags: tags && tags.length ? tags : undefined,
  }) as unknown as () => Promise<T>;
}

/**
 * Predefined cached queries for master data
 */
export const cachedMasters = {
  getCategories: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.categoryCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "categories"],
      CACHE_TTLS.MASTERS,
      ["masters:categories"]
    ),

  getGemstones: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.gemstoneCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "gemstones"],
      CACHE_TTLS.MASTERS,
      ["masters:gemstones"]
    ),

  getColors: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.colorCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "colors"],
      CACHE_TTLS.MASTERS,
      ["masters:colors"]
    ),

  getVendors: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.vendor.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "vendors"],
      CACHE_TTLS.MASTERS,
      ["masters:vendors"]
    ),

  getApprovedVendors: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.vendor.findMany({
        where: { status: "APPROVED" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      ["masters", "approved-vendors"],
      CACHE_TTLS.MASTERS,
      ["masters:approved-vendors"]
    ),

  getCollections: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.collectionCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "collections"],
      CACHE_TTLS.MASTERS,
      ["masters:collections"]
    ),

  getRashis: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.rashiCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "rashis"],
      CACHE_TTLS.MASTERS,
      ["masters:rashis"]
    ),

  getCertificates: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.certificateCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true, remarks: true },
      }),
      ["masters", "certificates"],
      CACHE_TTLS.MASTERS,
      ["masters:certificates"]
    ),

  getCuts: (prisma: PrismaClient) =>
    cacheQuery(
      () => prisma.cutCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, status: true },
      }),
      ["masters", "cuts"],
      CACHE_TTLS.MASTERS,
      ["masters:cuts"]
    ),

  getSettings: (prisma: PrismaClient) =>
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
