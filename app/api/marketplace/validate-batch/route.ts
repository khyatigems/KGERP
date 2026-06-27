import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";

export const dynamic = "force-dynamic";

const MAX_BATCH = 200;

const MARKETPLACE_NORMALIZE: Record<string, string> = {
  ebay: "EBAY",
  etsy: "ETSY",
  amazon: "AMAZON",
};

function normalizeMarketplace(value: string | null | undefined): string {
  const raw = String(value || "").trim().toLowerCase();
  return MARKETPLACE_NORMALIZE[raw] || raw.toUpperCase();
}

type InputItem = {
  marketplace?: string;
  listingId?: string;
  sku?: string;
};

type ResultItem = {
  input: { marketplace: string; listingId: string; sku: string };
  matchLevel:
    | "exact_listing"
    | "product_no_listing"
    | "sku_mismatch"
    | "sku_not_found"
    | "missing_sku"
    | "missing_listing_id"
    | "duplicate_only";
  product: {
    id: string;
    sku: string;
    name: string;
    sellingPrice: number;
    status: string;
  } | null;
  sameListing: {
    id: string;
    marketplace: string;
    listingId: string;
    listedPrice: number;
    currency: string;
    status: string;
  } | null;
  duplicateListings: Array<{
    id: string;
    marketplace: string;
    listingId: string;
    listedPrice: number;
    currency: string;
    status: string;
  }>;
};

function compareSku(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  let body: { items?: InputItem[] };
  try {
    body = (await request.json()) as { items?: InputItem[] };
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ results: [], stats: { requested: 0, found: 0, notFound: 0, duplicates: 0 } });
  }

  if (items.length > MAX_BATCH) {
    return NextResponse.json(
      { message: `Batch too large; max ${MAX_BATCH} items per request` },
      { status: 400 }
    );
  }

  const normalized = items.map((raw) => {
    const marketplace = normalizeMarketplace(raw.marketplace);
    const listingId = String(raw.listingId || "").trim();
    const sku = String(raw.sku || "").trim();
    return { marketplace, listingId, sku };
  });

  const validItems = normalized.filter((i) => i.sku && i.listingId);
  const validSkus = Array.from(new Set(validItems.map((i) => i.sku)));
  const validListingIds = Array.from(new Set(validItems.map((i) => i.listingId)));
  const validMarketplaces = Array.from(new Set(validItems.map((i) => i.marketplace))).filter(Boolean);

  const products = validSkus.length
    ? await prisma.inventory.findMany({
        where: { sku: { in: validSkus } },
        select: {
          id: true,
          sku: true,
          itemName: true,
          internalName: true,
          sellingPrice: true,
          status: true,
          listings: {
            where: validListingIds.length
              ? {
                  OR: [
                    {
                      externalId: { in: validListingIds },
                      platform: { in: validMarketplaces }
                    },
                    {
                      platform: { in: validMarketplaces }
                    }
                  ]
                }
              : { platform: { in: validMarketplaces } },
            select: {
              id: true,
              platform: true,
              externalId: true,
              listingRef: true,
              listedPrice: true,
              currency: true,
              status: true
            }
          }
        }
      })
    : [];

  const productBySku = new Map(products.map((p) => [p.sku.toLowerCase(), p]));

  const results: ResultItem[] = normalized.map((input) => {
    const baseResult = {
      input: { marketplace: input.marketplace, listingId: input.listingId, sku: input.sku }
    };

    if (!input.sku) {
      return { ...baseResult, matchLevel: "missing_sku", product: null, sameListing: null, duplicateListings: [] };
    }
    if (!input.listingId) {
      return { ...baseResult, matchLevel: "missing_listing_id", product: null, sameListing: null, duplicateListings: [] };
    }

    const product = productBySku.get(input.sku.toLowerCase());
    if (!product) {
      return { ...baseResult, matchLevel: "sku_not_found", product: null, sameListing: null, duplicateListings: [] };
    }

    const productForReturn = {
      id: product.id,
      sku: product.sku,
      name: product.itemName || product.internalName || product.sku,
      sellingPrice: product.sellingPrice,
      status: product.status
    };

    const allListingsForProduct = product.listings;
    const sameListingRaw = allListingsForProduct.find(
      (l) => l.platform === input.marketplace && l.externalId === input.listingId
    );

    if (!sameListingRaw) {
      const duplicates = allListingsForProduct
        .filter((l) => l.platform === input.marketplace && l.externalId !== input.listingId)
        .map((l) => ({
          id: l.id,
          marketplace: l.platform.toLowerCase(),
          listingId: l.externalId || "",
          listedPrice: l.listedPrice,
          currency: l.currency,
          status: l.status
        }));
      return {
        ...baseResult,
        matchLevel: duplicates.length ? "duplicate_only" : "product_no_listing",
        product: productForReturn,
        sameListing: null,
        duplicateListings: duplicates
      };
    }

    const refMatches = compareSku(sameListingRaw.listingRef, input.sku);

    if (!refMatches) {
      const duplicates = allListingsForProduct
        .filter((l) => l.platform === input.marketplace && l.id !== sameListingRaw.id)
        .map((l) => ({
          id: l.id,
          marketplace: l.platform.toLowerCase(),
          listingId: l.externalId || "",
          listedPrice: l.listedPrice,
          currency: l.currency,
          status: l.status
        }));
      return {
        ...baseResult,
        matchLevel: "sku_mismatch",
        product: productForReturn,
        sameListing: {
          id: sameListingRaw.id,
          marketplace: sameListingRaw.platform.toLowerCase(),
          listingId: sameListingRaw.externalId || "",
          listedPrice: sameListingRaw.listedPrice,
          currency: sameListingRaw.currency,
          status: sameListingRaw.status
        },
        duplicateListings: duplicates
      };
    }

    const duplicates = allListingsForProduct
      .filter((l) => l.platform === input.marketplace && l.id !== sameListingRaw.id)
      .map((l) => ({
        id: l.id,
        marketplace: l.platform.toLowerCase(),
        listingId: l.externalId || "",
        listedPrice: l.listedPrice,
        currency: l.currency,
        status: l.status
      }));

    return {
      ...baseResult,
      matchLevel: "exact_listing",
      product: productForReturn,
      sameListing: {
        id: sameListingRaw.id,
        marketplace: sameListingRaw.platform.toLowerCase(),
        listingId: sameListingRaw.externalId || "",
        listedPrice: sameListingRaw.listedPrice,
        currency: sameListingRaw.currency,
        status: sameListingRaw.status
      },
      duplicateListings: duplicates
    };
  });

  const stats = {
    requested: results.length,
    found: results.filter((r) => r.product !== null).length,
    notFound: results.filter((r) => r.product === null).length,
    duplicates: results.filter((r) => r.duplicateListings.length > 0).length
  };

  return NextResponse.json({ results, stats });
}
