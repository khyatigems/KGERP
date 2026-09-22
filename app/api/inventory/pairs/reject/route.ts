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
    const { pairId } = body;

    if (!pairId) {
      return NextResponse.json({ error: "pairId is required" }, { status: 400 });
    }

    const pair = await prisma.inventoryPair.findUnique({
      where: { id: pairId },
      include: { inventoryA: true, inventoryB: true },
    });

    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    if (pair.status !== "SUGGESTED") {
      return NextResponse.json({ error: "Pair already confirmed or rejected" }, { status: 400 });
    }

    const updated = await prisma.inventoryPair.update({
      where: { id: pairId },
      data: {
        status: "REJECTED",
        confirmedById: session.user.id,
        confirmedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "InventoryPair",
        entityId: updated.id,
        actionType: "REJECTED",
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        module: "inventory",
        action: "reject_pair",
        details: JSON.stringify({
          inventoryIdA: pair.inventoryIdA,
          inventoryIdB: pair.inventoryIdB,
          skuA: pair.inventoryA.sku,
          skuB: pair.inventoryB.sku,
          score: pair.score,
        }),
      },
    });

    return NextResponse.json({ success: true, pair: updated });
  } catch (error) {
    console.error("[pairs/reject] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}