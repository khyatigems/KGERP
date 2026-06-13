import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";
import { logActivity } from "@/lib/activity-logger";
import { logMarketplaceActivity } from "@/lib/marketplace-control-center";

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
      include: { inventory: { select: { id: true, sku: true } } },
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

    // Fire side effects asynchronously
    Promise.all([
      (async () => {
        if (price !== undefined && price !== existing.listedPrice) {
          await prisma.listingPriceHistory.create({
            data: {
              listingId: id,
              price,
              changedBy: "Chrome Extension",
            },
          });
        }
      })(),
      logActivity({
        entityType: "Listing",
        entityId: id,
        entityIdentifier: `${updated.platform} - ${inventory.sku}`,
        actionType: "EDIT",
        oldData: existing,
        newData: updated,
        source: "EXTENSION",
      }),
      logMarketplaceActivity({
        entityType: "Inventory",
        entityId: inventory.id,
        entityIdentifier: inventory.sku,
        actionType: "LISTING_UPDATED",
        details: `${updated.platform} listing updated for ${inventory.sku}`,
        source: "EXTENSION",
        metadata: { platform: updated.platform, listingId: updated.id, listingUrl: updated.listingUrl || null },
      }),
    ]).catch((e) => console.error("Post-update logging failed:", e));

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
