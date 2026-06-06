import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

function productSelect() {
  return {
    id: true,
    sku: true,
    itemName: true,
    internalName: true,
    category: true,
    gemType: true,
    color: true,
    sellingPrice: true,
    status: true,
    imageUrl: true,
    media: {
      select: {
        mediaUrl: true,
        type: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
      take: 3,
    },
  };
}

function toProduct(item: Prisma.InventoryGetPayload<{ select: ReturnType<typeof productSelect> }>) {
  const imageMedia = item.media.find((media) => String(media.type).toUpperCase() === "IMAGE");

  return {
    id: item.id,
    sku: item.sku,
    name: item.itemName || item.internalName || item.sku,
    title: item.itemName || item.internalName || item.sku,
    category: item.category,
    gemType: item.gemType,
    color: item.color,
    sellingPrice: item.sellingPrice,
    status: item.status,
    image: imageMedia?.mediaUrl || item.imageUrl || "",
    url: `/inventory/${item.id}`,
  };
}

export async function GET(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  const query = (request.nextUrl.searchParams.get("q") || "").trim();
  const type = (request.nextUrl.searchParams.get("type") || "sku").trim();

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  const where: Prisma.InventoryWhereInput =
    type === "productId"
      ? { id: query }
      : type === "name"
        ? {
            OR: [
              { itemName: { contains: query } },
              { internalName: { contains: query } },
              { category: { contains: query } },
              { gemType: { contains: query } },
            ],
          }
        : { sku: { contains: query } };

  const items = await prisma.inventory.findMany({
    where,
    orderBy: [{ sku: "asc" }],
    take: 25,
    select: productSelect(),
  });

  return NextResponse.json({ products: items.map(toProduct) });
}
