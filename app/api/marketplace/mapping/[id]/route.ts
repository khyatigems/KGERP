import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

type MappingBody = {
  productId?: string;
  marketplace?: string;
  listingId?: string;
  listingUrl?: string;
  marketplaceSku?: string;
  mpn?: string;
  price?: string | number;
  currency?: string;
  status?: string;
};

function toPrice(value: string | number | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json()) as MappingBody;
  const price = toPrice(body.price);

  const existing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
  }

  if (body.productId) {
    const inventory = await prisma.inventory.findUnique({
      where: { id: body.productId },
      select: { id: true },
    });
    if (!inventory) {
      return NextResponse.json({ message: "ERP product not found" }, { status: 404 });
    }
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...(body.productId !== undefined && { inventoryId: body.productId }),
      ...(body.marketplace !== undefined && { platform: body.marketplace.trim().toUpperCase() }),
      ...(body.listingId !== undefined && { externalId: body.listingId }),
      ...(body.listingUrl !== undefined && { listingUrl: body.listingUrl }),
      ...((body.marketplaceSku !== undefined || body.mpn !== undefined) && { listingRef: body.marketplaceSku || body.mpn || null }),
      ...(price !== undefined && { listedPrice: price }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: {
      inventory: {
        select: { sku: true, itemName: true },
      },
    },
  });

  return NextResponse.json({
    mapping: {
      id: updated.id,
      mappingId: updated.id,
      productId: updated.inventoryId,
      sku: updated.inventory.sku,
      productName: updated.inventory.itemName,
      marketplace: updated.platform.toLowerCase(),
      listingId: updated.externalId || "",
      listingUrl: updated.listingUrl || "",
      marketplaceSku: updated.listingRef || "",
      mpn: updated.listingRef || "",
      price: String(updated.listedPrice),
      currency: updated.currency,
      quantity: 1,
      status: updated.status,
      dateLinked: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
