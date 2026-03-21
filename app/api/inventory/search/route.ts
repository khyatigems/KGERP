import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const toNumber = (value: string | null) => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toDate = (value: string | null) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.INVENTORY_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const category = (sp.get("category") || "").trim();
  const gemType = (sp.get("gemType") || "").trim();
  const color = (sp.get("color") || "").trim();
  const status = (sp.get("status") || "").trim();
  const sort = (sp.get("sort") || "createdAt_desc").trim();

  const minPrice = toNumber(sp.get("minPrice"));
  const maxPrice = toNumber(sp.get("maxPrice"));
  const createdFrom = toDate(sp.get("createdFrom"));
  const createdTo = toDate(sp.get("createdTo"));

  const page = Math.max(1, toNumber(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, toNumber(sp.get("pageSize")) || 25));

  const where: Prisma.InventoryWhereInput = {};

  if (status) where.status = status;
  if (category) where.category = category;
  if (gemType) where.gemType = gemType;
  if (color) where.color = color;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.sellingPrice = {
      gte: minPrice,
      lte: maxPrice,
    };
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      gte: createdFrom,
      lte: createdTo,
    };
  }

  if (q) {
    where.OR = [
      { sku: { contains: q } },
      { itemName: { contains: q } },
      { internalName: { contains: q } },
      { category: { contains: q } },
      { gemType: { contains: q } },
      { color: { contains: q } },
      { dimensionsMm: { contains: q } },
      { beadSizeLabel: { contains: q } },
      { standardSize: { contains: q } },
      { certificateNo: { contains: q } },
      { certificateNumber: { contains: q } },
      { notes: { contains: q } },
    ];
  }

  const orderBy: Prisma.InventoryOrderByWithRelationInput = (() => {
    switch (sort) {
      case "sku_asc":
        return { sku: "asc" };
      case "sku_desc":
        return { sku: "desc" };
      case "name_asc":
        return { itemName: "asc" };
      case "price_asc":
        return { sellingPrice: "asc" };
      case "price_desc":
        return { sellingPrice: "desc" };
      case "createdAt_asc":
        return { createdAt: "asc" };
      default:
        return { createdAt: "desc" };
    }
  })();

  const [total, items] = await Promise.all([
    prisma.inventory.count({ where }),
    prisma.inventory.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        itemName: true,
        category: true,
        gemType: true,
        color: true,
        sellingPrice: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, items });
}
