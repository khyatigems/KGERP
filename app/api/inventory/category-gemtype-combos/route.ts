import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = await checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW);
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const combos = await prisma.$queryRaw<Array<{ category: string; gemType: string }>>`
      SELECT DISTINCT "category", "gemType"
      FROM "Inventory"
      WHERE "category" IS NOT NULL
        AND "category" != ''
        AND "gemType" IS NOT NULL
        AND "gemType" != ''
      ORDER BY "category" ASC, "gemType" ASC
    `;

    const comboList = combos
      .filter((combo) => combo.category && combo.gemType)
      .map((combo) => ({
        key: `${combo.category}|${combo.gemType}`,
        category: combo.category,
        gemType: combo.gemType,
      }));

    return NextResponse.json({ success: true, combos: comboList });
  } catch (error) {
    console.error("[Category GemType Combos API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch category-gem type combos",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
