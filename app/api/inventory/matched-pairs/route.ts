import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { findAllMatches, DEFAULT_MATCH_CONFIG, InventoryItem } from "@/lib/inventory-matching";

function toNumber(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const minScore = toNumber(sp.get("minScore")) || DEFAULT_MATCH_CONFIG.minScore;
    const matchType = (sp.get("matchType") || "ALL").toUpperCase();
    const gemType = (sp.get("gemType") || "").trim();
    const status = (sp.get("status") || "IN_STOCK,RESERVED").split(",").map(s => s.trim());
    const limit = Math.min(100, Math.max(1, toNumber(sp.get("limit")) || 50));
    const offset = Math.max(0, toNumber(sp.get("offset")) || 0);
    const includeSets = sp.get("includeSets") !== "false";

    const config = { ...DEFAULT_MATCH_CONFIG, minScore };

    const where: Record<string, unknown> = {
      status: { in: status },
    };

    if (gemType) where.gemType = gemType;

    const items = await prisma.inventory.findMany({
      where,
      select: {
        id: true,
        sku: true,
        itemName: true,
        gemType: true,
        color: true,
        shape: true,
        carats: true,
        clarity: true,
        clarityGrade: true,
        cut: true,
        cutGrade: true,
        dimensionsMm: true,
        measurements: true,
        origin: true,
        treatment: true,
        certification: true,
        lab: true,
        sellingPrice: true,
        imageUrl: true,
        status: true,
      },
      take: 5000,
    });

    const inventoryItems: InventoryItem[] = items.map(item => ({
      ...item,
      carats: Number(item.carats) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
    }));

    const { pairs, sets, summary } = findAllMatches(inventoryItems, includeSets, config);

    let filteredPairs = pairs;
    let filteredSets = sets;

    if (matchType === "PAIR") {
      filteredSets = [];
    } else if (matchType === "SET_3") {
      filteredPairs = [];
      filteredSets = sets.filter(s => s.matchType === "SET_3");
    } else if (matchType === "SET_4") {
      filteredPairs = [];
      filteredSets = sets.filter(s => s.matchType === "SET_4");
    }

    const allResults = [...filteredPairs, ...filteredSets].sort((a, b) => b.score - a.score);
    const paginated = allResults.slice(offset, offset + limit);

    // Recalculate summary from filtered results
    const excellentThreshold = config.excellentThreshold;
    const goodThreshold = config.goodThreshold;
    let excellentCount = 0;
    let goodCount = 0;
    let possibleCount = 0;
    let totalValue = 0;
    for (const r of allResults) {
      totalValue += r.suggestedPrice;
      if (r.score >= excellentThreshold) excellentCount++;
      else if (r.score >= goodThreshold) goodCount++;
      else possibleCount++;
    }

    return NextResponse.json({
      pairs: filteredPairs,
      sets: filteredSets,
      results: paginated,
      total: allResults.length,
      totalValue,
      summary: {
        excellentPairs: excellentCount,
        goodPairs: goodCount,
        possibleMatches: possibleCount,
        totalPairs: filteredPairs.length,
        totalSets: filteredSets.length,
      },
    }, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[matched-pairs] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}