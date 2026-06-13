import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceControlCenterSchema } from "@/lib/marketplace-control-center";

export const revalidate = 30;

export async function GET() {
  try {
    await ensureMarketplaceControlCenterSchema();

    const [
      countRows,
      conflictRows,
      statusBreakdown,
      recentActivity,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total FROM "Listing" WHERE UPPER("status") IN ('ACTIVE', 'LISTED')`
      ),
      prisma.$queryRawUnsafe<Array<{ conflictStatus: string; activePlatforms: string | null; currentQuantity: number }>>(
        `SELECT "conflictStatus", "activePlatforms", "currentQuantity" FROM "MarketplaceConflict"`
      ),
      prisma.listing.groupBy({
        by: ["status"],
        _count: { id: true },
      }).catch(() => []),
      prisma.listing.findMany({
        take: 4,
        orderBy: { updatedAt: "desc" },
        include: {
          inventory: { select: { sku: true, itemName: true } },
        },
      }).catch(() => []),
    ]);

    const totalListings = Number(countRows[0]?.total || 0);

    let pendingConflicts = 0;
    let criticalConflicts = 0;

    for (const row of conflictRows) {
      if (row.conflictStatus === "Pending") {
        pendingConflicts++;
        const active = parseActivePlatforms(row.activePlatforms);
        if (active.length > 1 || Number(row.currentQuantity || 0) === 0) {
          criticalConflicts++;
        }
      }
    }

    const listingStatusBreakdown: Record<string, number> = {};
    for (const entry of statusBreakdown) {
      listingStatusBreakdown[entry.status] = entry._count.id;
    }

    const mappedActivity = recentActivity.map((item) => ({
      id: item.id,
      inventoryId: item.inventoryId,
      platform: item.platform,
      status: item.status,
      listedPrice: item.listedPrice,
      currency: item.currency,
      listingUrl: item.listingUrl || null,
      updatedAt: item.updatedAt.toISOString(),
      sku: item.inventory?.sku || null,
      itemName: item.inventory?.itemName || null,
    }));

    return NextResponse.json({
      totalListings,
      pendingConflicts,
      criticalConflicts,
      listingStatusBreakdown,
      recentActivity: mappedActivity,
    });
  } catch (error) {
    console.error("[Marketplace Stats] Error:", error);
    return NextResponse.json({
      totalListings: 0,
      pendingConflicts: 0,
      criticalConflicts: 0,
      listingStatusBreakdown: {},
      recentActivity: [],
    });
  }
}

function parseActivePlatforms(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}
