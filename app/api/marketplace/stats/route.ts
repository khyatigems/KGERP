import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceControlCenterSchema } from "@/lib/marketplace-control-center";

export const revalidate = 30;

export async function GET() {
  try {
    await ensureMarketplaceControlCenterSchema();

    const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM "Listing" WHERE UPPER("status") IN ('ACTIVE', 'LISTED')`
    );
    const totalListings = Number(countRows[0]?.total || 0);

    const conflictRows = await prisma.$queryRawUnsafe<Array<{ conflictStatus: string; activePlatforms: string | null; currentQuantity: number }>>(
      `SELECT "conflictStatus", "activePlatforms", "currentQuantity" FROM "MarketplaceConflict"`
    );

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

    return NextResponse.json({ totalListings, pendingConflicts, criticalConflicts });
  } catch (error) {
    console.error("[Marketplace Stats] Error:", error);
    return NextResponse.json({ totalListings: 0, pendingConflicts: 0, criticalConflicts: 0 });
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
