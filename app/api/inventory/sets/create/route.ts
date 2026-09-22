import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { inventoryIds, matchType, name, suggestedPrice, matchDetails, score } = body;

    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length < 3) {
      return NextResponse.json({ error: "At least 3 inventory IDs required" }, { status: 400 });
    }
    if (!matchType || !["SET_3", "SET_4"].includes(matchType)) {
      return NextResponse.json({ error: "matchType must be SET_3 or SET_4" }, { status: 400 });
    }
    if (matchType === "SET_3" && inventoryIds.length !== 3) {
      return NextResponse.json({ error: "SET_3 requires exactly 3 items" }, { status: 400 });
    }
    if (matchType === "SET_4" && inventoryIds.length !== 4) {
      return NextResponse.json({ error: "SET_4 requires exactly 4 items" }, { status: 400 });
    }

    const items = await prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, sku: true, sellingPrice: true },
    });

    if (items.length !== inventoryIds.length) {
      return NextResponse.json({ error: "Some inventory items not found" }, { status: 404 });
    }

    const totalValue = items.reduce((sum, item) => sum + Number(item.sellingPrice), 0);

    const set = await prisma.inventorySet.create({
      data: {
        name: name || `${matchType} - ${items.map(i => i.sku).join(", ")}`,
        matchType,
        itemCount: inventoryIds.length,
        score: score || 0,
        matchDetails: matchDetails || {},
        suggestedPrice: suggestedPrice || Math.round(totalValue * 1.12),
        createdById: session.user.id,
        items: {
          create: inventoryIds.map((inventoryId, index) => ({
            inventoryId,
            position: index + 1,
          })),
        },
      },
      include: { items: { include: { inventory: true } } },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "InventorySet",
        entityId: set.id,
        actionType: "CREATED",
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        module: "inventory",
        action: "create_set",
        details: JSON.stringify({
          matchType,
          inventoryIds,
          skus: items.map(i => i.sku),
          totalValue,
          suggestedPrice: set.suggestedPrice,
        }),
      },
    });

    return NextResponse.json({ success: true, set });
  } catch (error) {
    console.error("[sets/create] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}