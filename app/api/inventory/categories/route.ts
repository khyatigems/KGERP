import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canView = await checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW);
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Fetch unique categories from inventory
    const categories = await prisma.$queryRaw<Array<{ category: string }>>`
      SELECT DISTINCT "category"
      FROM "Inventory"
      WHERE "category" IS NOT NULL
      AND "category" != ''
      ORDER BY "category" ASC
    `;

    const categoryList = categories.map((c) => c.category).filter(Boolean);

    return NextResponse.json({
      success: true,
      categories: categoryList,
    });
  } catch (error) {
    console.error("[Categories API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch categories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
