import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

type MappingBody = {
  productId?: string;
  sku?: string;
  productName?: string;
  marketplace?: string;
  listingId?: string;
  listingUrl?: string;
  marketplaceSku?: string;
  mpn?: string;
  title?: string;
  price?: string | number;
  currency?: string;
  quantity?: number;
  image?: string;
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

  try {
    const { id } = await context.params;
    const body = (await request.json()) as MappingBody;
    const price = toPrice(body.price);

    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, inventoryId: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
    }

    const targetInventoryId = body.productId || existing.inventoryId;

    const inventory = await prisma.inventory.findUnique({
      where: { id: targetInventoryId },
      select: { id: true, sku: true, itemName: true },
    });

    if (!inventory) {
      return NextResponse.json({ message: "ERP product not found" }, { status: 404 });
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
        ...(body.status !== undefined && { status: body.status.toUpperCase() }),
      },
    });

    return NextResponse.json({
      mapping: {
        id: updated.id,
        mappingId: updated.id,
        productId: updated.inventoryId,
        sku: inventory.sku,
        productName: inventory.itemName,
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
  } catch (error) {
    console.error("PUT /api/marketplace/mapping/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message, code: "UPDATE_FAILED" }, { status: 500 });
  }
}
