import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { items, customerName } = await req.json().catch(() => ({}));
  if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create Memo for replacement dispatch
      const memo = await tx.memo.create({
        data: {
          customerName: customerName || "Customer",
        },
      });
      for (const item of items as Array<{ inventoryId: string }>) {
        await tx.memoItem.create({
          data: {
            memoId: memo.id,
            inventoryId: item.inventoryId,
            status: "WITH_CLIENT",
          },
        });
        await tx.inventory.update({ where: { id: item.inventoryId }, data: { status: "MEMO" } });
      }
      await tx.activityLog.create({
        data: {
          entityType: "Memo",
          entityId: memo.id,
          entityIdentifier: memo.id,
          actionType: "CREATE",
          source: "WEB",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          details: `Replacement dispatch for SalesReturn ${id}`,
        },
      });
      return { memoId: memo.id };
    });
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Failed to create replacement memo" }, { status: 500 });
  }
}

