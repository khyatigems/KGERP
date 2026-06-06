import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const item = await prisma.inventory.findUnique({
    where: { id },
    select: {
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
    },
  });

  if (!item) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: item.id,
    sku: item.sku,
    name: item.itemName || item.internalName || item.sku,
    title: item.itemName || item.internalName || item.sku,
    category: item.category,
    gemType: item.gemType,
    color: item.color,
    sellingPrice: item.sellingPrice,
    status: item.status,
    image: item.imageUrl || "",
    url: `/inventory/${item.id}`,
  });
}
