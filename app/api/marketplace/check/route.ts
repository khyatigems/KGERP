import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

function toMapping(listing: Awaited<ReturnType<typeof findMapping>>) {
  if (!listing) return null;

  return {
    id: listing.id,
    mappingId: listing.id,
    productId: listing.inventoryId,
    sku: listing.inventory.sku,
    productName: listing.inventory.itemName,
    marketplace: listing.platform.toLowerCase(),
    listingId: listing.externalId || "",
    listingUrl: listing.listingUrl || "",
    marketplaceSku: listing.listingRef || "",
    mpn: listing.listingRef || "",
    price: String(listing.listedPrice),
    currency: listing.currency,
    quantity: 1,
    status: listing.status,
    dateLinked: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

async function findMapping(marketplace: string, listingId: string) {
  return prisma.listing.findFirst({
    where: {
      platform: marketplace.toUpperCase(),
      externalId: listingId,
    },
    include: {
      inventory: {
        select: {
          sku: true,
          itemName: true,
        },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  const marketplace = (request.nextUrl.searchParams.get("marketplace") || "").trim();
  const listingId = (request.nextUrl.searchParams.get("listingId") || "").trim();

  if (!marketplace || !listingId) {
    return NextResponse.json({ message: "marketplace and listingId are required" }, { status: 400 });
  }

  const listing = await findMapping(marketplace, listingId);
  return NextResponse.json({ mapping: toMapping(listing) });
}
