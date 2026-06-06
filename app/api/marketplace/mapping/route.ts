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
  status?: string;
};

function normalizeMarketplace(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function toPrice(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mappingResponse(listing: {
  id: string;
  inventoryId: string;
  platform: string;
  externalId: string | null;
  listingUrl: string | null;
  listingRef: string | null;
  listedPrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  inventory: { sku: string; itemName: string };
}) {
  return {
    mapping: {
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
      quantity: 1,
      status: listing.status,
      dateLinked: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    },
  };
}

export async function POST(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as MappingBody;
  const productId = String(body.productId || "").trim();
  const platform = normalizeMarketplace(body.marketplace);
  const listingId = String(body.listingId || "").trim();

  if (!productId || !platform || !listingId) {
    return NextResponse.json({ message: "productId, marketplace, and listingId are required" }, { status: 400 });
  }

  const inventory = await prisma.inventory.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!inventory) {
    return NextResponse.json({ message: "ERP product not found" }, { status: 404 });
  }

  const existing = await prisma.listing.findFirst({
    where: { platform, externalId: listingId },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Marketplace listing is already mapped", mapping: { id: existing.id, mappingId: existing.id } },
      { status: 409 }
    );
  }

  const listing = await prisma.listing.create({
    data: {
      inventoryId: productId,
      platform,
      externalId: listingId,
      listingUrl: body.listingUrl || null,
      listingRef: body.marketplaceSku || body.mpn || null,
      listedPrice: toPrice(body.price),
      status: body.status || "ACTIVE",
      currency: "USD",
    },
    include: {
      inventory: {
        select: { sku: true, itemName: true },
      },
    },
  });

  return NextResponse.json(mappingResponse(listing), { status: 201 });
}
