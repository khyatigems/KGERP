import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";
import { buildReadyToSellWhere } from "@/lib/inventory-ready-to-sell";
import { MARKETPLACE_LISTING_SCOPE_SQL, marketplaceInventoryJoinSql } from "@/lib/marketplace-control-center";


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
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureInventoryBraceletSchema();

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const category = (sp.get("category") || "").trim();
  const gemType = (sp.get("gemType") || "").trim();
  const color = (sp.get("color") || "").trim();
  const status = (sp.get("status") || "").trim();
  const sort = (sp.get("sort") || "createdAt_desc").trim();
  const includeListings = sp.get("includeListings") === "1";
  const marketplaceReadyOnly = sp.get("marketplaceReadyOnly") === "1";
  const listingMarketplace = (sp.get("marketplace") || "").trim().toUpperCase();
  const listingShopId = (sp.get("shopId") || "").trim();
  if (listingMarketplace || listingShopId) {
    if (!["EBAY", "ETSY"].includes(listingMarketplace) || !listingShopId) {
      return NextResponse.json({ error: "A valid marketplace and connected shop are required for listing eligibility." }, { status: 400 });
    }
    const shop = await prisma.marketplaceShop.findFirst({
      where: {
        id: listingShopId,
        marketplace: listingMarketplace,
        status: "CONNECTED",
        connection: { status: "CONNECTED" },
      },
      select: { id: true },
    });
    if (!shop) {
      return NextResponse.json({ error: "The selected marketplace shop is not connected." }, { status: 404 });
    }
  }

  const minPrice = toNumber(sp.get("minPrice"));
  const maxPrice = toNumber(sp.get("maxPrice"));
  const createdFrom = toDate(sp.get("createdFrom"));
  const createdTo = toDate(sp.get("createdTo"));

  const page = Math.max(1, toNumber(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, toNumber(sp.get("pageSize")) || 25));

  const where: Prisma.InventoryWhereInput = {};

  if (status) where.status = status;
  if (marketplaceReadyOnly) {
    Object.assign(where, buildReadyToSellWhere());
  }
  if (listingMarketplace && listingShopId) {
    const listedInventory = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT DISTINCT i."id"
      FROM "Listing" l
      ${Prisma.raw(marketplaceInventoryJoinSql("INNER"))}
      WHERE ${Prisma.raw(MARKETPLACE_LISTING_SCOPE_SQL)}
        AND l."marketplaceShopId" = ${listingShopId}
        AND UPPER(TRIM(l."platform")) = ${listingMarketplace}
    `);
    if (listedInventory.length) {
      where.id = { notIn: listedInventory.map((row) => row.id) };
    }
  }
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
    const or = [
      { sku: { contains: q } },
      { itemName: { contains: q } },
      { internalName: { contains: q } },
      { category: { contains: q } },
      { gemType: { contains: q } },
      { color: { contains: q } },
      { dimensionsMm: { contains: q } },
      { standardSize: { contains: q } },
      { certificateNo: { contains: q } },
      { certificateNumber: { contains: q } },
      { notes: { contains: q } },
      { beadSizeLabel: { contains: q } } as unknown as Prisma.InventoryWhereInput,
    ] as Prisma.InventoryWhereInput[];

    (where as unknown as { OR?: Prisma.InventoryWhereInput[] }).OR = or;
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
        shape: true,
        etsyDescription: true,
        pricingMode: true,
        sellingRatePerCarat: true,
        flatSellingPrice: true,
        sellingPrice: true,
        weightValue: true,
        weightUnit: true,
        imageUrl: true,
        media: {
          where: { type: "IMAGE" },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { mediaUrl: true },
        },
        status: true,
        createdAt: true,
        ...(includeListings
          ? {
              listings: {
                select: { platform: true },
              },
            }
          : {}),
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl || item.media[0]?.mediaUrl || null,
      media: undefined,
    })),
  });
}
