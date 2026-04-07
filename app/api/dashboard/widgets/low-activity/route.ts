import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkUserPermission(userId, PERMISSIONS.REPORTS_VIEW);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const saleDays = Number(sp.get("saleDays") || 14);
  const invDays = Number(sp.get("invDays") || 7);

  const now = new Date();
  const saleCutoff = new Date(now.getTime() - saleDays * 24 * 60 * 60 * 1000);
  const invCutoff = new Date(now.getTime() - invDays * 24 * 60 * 60 * 1000);

  const lastSale = await prisma.sale.findFirst({ orderBy: { saleDate: "desc" }, select: { saleDate: true } });
  const lastInventory = await prisma.inventory.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  const nosale = !lastSale || (lastSale.saleDate && lastSale.saleDate < saleCutoff);
  const noinv = !lastInventory || (lastInventory.createdAt && lastInventory.createdAt < invCutoff);

  const staleSkusCount = await prisma.inventory.count({
    where: { status: "IN_STOCK", createdAt: { lte: invCutoff } },
  });

  return NextResponse.json({
    saleDays,
    invDays,
    lastSaleDate: lastSale?.saleDate || null,
    lastInventoryDate: lastInventory?.createdAt || null,
    nosale,
    noinv,
    staleSkusCount,
  });
}

