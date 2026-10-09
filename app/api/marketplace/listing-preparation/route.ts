import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
import { getEbaySettings } from "@/lib/ebay-settings";
import { analyzePricing, resolvePurchaseCost } from "@/lib/pricing/engine";
import { getCurrencyRates, getDefaultProfile, getProfileByName } from "@/lib/pricing/db";
import { calculateDiscountedInr } from "@/lib/marketplace/price-preview";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { EtsyConnector } from "@/lib/marketplace/connectors/etsy";
import { hasOAuthScope } from "@/lib/marketplace/scopes";
import { HttpError } from "@/lib/marketplace/http";
import { DraftSettingsError } from "@/lib/marketplace/draft-settings";
import { MARKETPLACE_LISTING_SCOPE_SQL, marketplaceInventoryJoinSql } from "@/lib/marketplace-control-center";
import {
  EBAY_TEMPLATE_CATEGORY_PATHS,
  isSensitiveEbayCertificateAspect,
  resolveEbayCondition,
  suggestEbayInventoryAspect,
} from "@/lib/marketplace/listing-preparation";

const requestSchema = z.object({
  action: z.enum(["prepare", "saveDraft", "saveEtsyPriceDraft", "validateEbay", "etsyRequirements", "shopSettings"]),
  draftSettings: z.object({
    fulfillmentPolicyId: z.string().max(80).optional(),
    paymentPolicyId: z.string().max(80).optional(),
    returnPolicyId: z.string().max(80).optional(),
    shippingProfileId: z.string().max(80).optional(),
    readinessStateId: z.string().max(80).optional(),
  }).optional(),
  inventoryId: z.string().uuid().optional(),
  shopId: z.string().min(1),
  template: z.enum(["LOOSE_GEMSTONE", "JEWELRY"]).optional(),
  categoryId: z.string().min(1).optional(),
  etsyTaxonomyId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  price: z.coerce.number().positive().optional(),
  currency: z.literal("USD").default("USD"),
  offerPercent: z.coerce.number().min(0).max(99.99).default(0),
  aspectValues: z.array(z.object({
    name: z.string().min(1),
    value: z.string().max(500),
  })).default([]),
  mediaUrls: z.array(z.string().url()).max(24).default([]),
  regionalPrices: z.object({
    india: z.coerce.number().positive(),
    us: z.coerce.number().positive(),
    global: z.coerce.number().positive(),
  }).optional(),
  usdToInr: z.coerce.number().positive().optional(),
  etsyListingDetails: z.object({
    productType: z.enum(["LOOSE_GEMSTONE", "BRACELET"]),
    categoryName: z.string().trim().min(1).max(200),
    taxonomyId: z.string().trim().min(1).max(40).optional(),
    shopSectionId: z.string().trim().max(40).optional(),
    description: z.string().trim().min(1).max(5000),
    craftType: z.string().trim().min(1).max(100),
    whoMade: z.enum(["I_DID", "SHOP_MEMBER", "ANOTHER_COMPANY_OR_PERSON"]),
    whatIsIt: z.enum(["FINISHED_PRODUCT", "SUPPLY_OR_TOOL"]),
    whenMade: z.string().trim().min(1).max(40),
    productionMethod: z.enum(["MADE_FROM_SCRATCH", "ASSEMBLED", "ALTERED", "CURATED_SET", "NATURAL_MATERIAL"]).optional(),
    toolsUsed: z.array(z.enum(["HAND_TOOLS", "COMPUTERIZED_TOOLS", "AI_GENERATOR", "NO_TOOLS"])).max(4),
    tags: z.array(z.string().trim().min(1).max(30)).max(13),
    quantity: z.coerce.number().int().min(1).max(999),
    categoryAttributes: z.array(z.object({
      name: z.string().trim().min(1).max(100),
      value: z.string().trim().min(1).max(300),
      propertyId: z.string().max(40).optional(),
      valueId: z.string().max(40).optional(),
    })).max(40),
  }).optional(),
});

class ListingPreparationError extends Error {
  constructor(message: string, readonly status: number = 422) {
    super(message);
    this.name = "ListingPreparationError";
  }
}

type EbaySettings = {
  companyName?: string | null;
  tagline?: string | null;
  brandLogoUrl?: string | null;
  globalBannerImages?: string | null;
  categoryImageUrls?: string | null;
  categoryGemtypeImageUrls?: string | null;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getMarketplaceDraftId(rawMetadata: string | null): string | null {
  const metadata = parseJson<{ marketplaceDraft?: { id?: string } }>(rawMetadata, {});
  return metadata.marketplaceDraft?.id || null;
}

function listingTitle(item: {
  itemName: string;
  weightValue: number | null;
  weightUnit: string | null;
}) {
  const weight = item.weightValue ? `${item.weightValue} ${item.weightUnit || "cts"}` : "";
  return [item.itemName, weight].filter(Boolean).join(" - ").slice(0, 80);
}

function suggestEtsyInventoryAttribute(
  propertyName: string,
  item: {
    gemType: string | null;
    stoneType: string | null;
    color: string | null;
    shape: string | null;
    weightValue: number | null;
    weightUnit: string | null;
    carats: number;
    origin: string | null;
    originCountry: string | null;
    treatment: string | null;
    holeSizeMm: number | null;
    beadSizeMm: number | null;
    braceletType: string | null;
    itemName: string;
  },
  allowedValues: Array<{ name: string }>
): string | null {
  const name = propertyName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  let candidate: string | null = null;
  if (/^(gemstone|gemstone type|gem type|main stone)$/.test(name)) candidate = item.gemType || item.stoneType;
  else if (/^(primary color|color|gemstone color)$/.test(name)) candidate = item.color;
  else if (/^(shape|gemstone shape|stone shape)$/.test(name)) candidate = item.shape;
  else if (/^(carat weight|weight|gemstone weight)$/.test(name)) {
    if (item.carats > 0) candidate = String(item.carats);
    else if (item.weightValue && /^(ct|cts|carat|carats)$/i.test(item.weightUnit || "")) candidate = String(item.weightValue);
  } else if (/^(stone source|origin|country of origin)$/.test(name)) candidate = item.originCountry || item.origin;
  else if (/^(bead hole size|hole size)$/.test(name) && item.holeSizeMm) candidate = `${item.holeSizeMm} mm`;
  else if (/^(bead size|bead diameter)$/.test(name) && item.beadSizeMm) candidate = `${item.beadSizeMm} mm`;
  else if (/^(bracelet type|style)$/.test(name)) candidate = item.braceletType;
  else if (/^(treatment|gemstone treatment)$/.test(name)) candidate = item.treatment;
  else if (name === "lab created" && /\b(lab[-\s]?created|lab[-\s]?grown|synthetic)\b/i.test(item.itemName)) candidate = "Yes";
  else if (name === "lab created" && /\bnatural\b/i.test(item.itemName)) candidate = "No";
  if (!candidate) return null;
  if (!allowedValues.length) return candidate;
  return allowedValues.find((value) => value.name.toLocaleLowerCase() === candidate?.toLocaleLowerCase())?.name || null;
}

async function findActiveListingForShop(input: {
  inventoryId: string;
  sku: string;
  platform: "EBAY" | "ETSY";
  shopId: string;
}) {
  const rows = await prisma.$queryRaw<Array<{
    externalId: string | null;
    listingUrl: string | null;
    status: string;
  }>>(Prisma.sql`
    SELECT l."externalId", l."listingUrl", l."status"
    FROM "Listing" l
    ${Prisma.raw(marketplaceInventoryJoinSql("INNER"))}
    WHERE ${Prisma.raw(MARKETPLACE_LISTING_SCOPE_SQL)}
      AND l."marketplaceShopId" = ${input.shopId}
      AND UPPER(TRIM(l."platform")) = ${input.platform}
      AND i."id" = ${input.inventoryId}
    LIMIT 1
  `);
  return rows[0] || null;
}

type ListingMediaAsset = { id: string; mediaUrl: string; type: string };

function selectListingMedia(
  requestedUrls: string[],
  assets: ListingMediaAsset[],
  marketplace: "EBAY" | "ETSY"
): ListingMediaAsset[] {
  const maxImages = marketplace === "EBAY" ? 24 : 20;
  const maxVideos = marketplace === "EBAY" ? 1 : 2;
  const selected = requestedUrls.length
    ? requestedUrls.map((url) => {
        const asset = assets.find((candidate) => candidate.mediaUrl === url);
        if (!asset) throw new ListingPreparationError("A selected media file is not attached to this inventory item.", 400);
        return asset;
      })
    : assets.filter((asset) => asset.type === "IMAGE").slice(0, 1);
  const unique = selected.filter((asset, index) =>
    selected.findIndex((candidate) => candidate.mediaUrl === asset.mediaUrl) === index
  );
  const imageCount = unique.filter((asset) => asset.type === "IMAGE").length;
  const videoCount = unique.filter((asset) => asset.type === "VIDEO").length;
  if (!imageCount) throw new ListingPreparationError("Select at least one product image.", 400);
  if (imageCount > maxImages || videoCount > maxVideos) {
    throw new ListingPreparationError(`${marketplace} supports up to ${maxImages} photos and ${maxVideos} video${maxVideos === 1 ? "" : "s"} per listing.`, 400);
  }
  return unique;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inventoryId = request.nextUrl.searchParams.get("inventoryId") || "";
  const marketplace = request.nextUrl.searchParams.get("marketplace") || "";
  if (!z.string().uuid().safeParse(inventoryId).success || !["EBAY", "ETSY"].includes(marketplace)) {
    return NextResponse.json({ error: "Valid inventory and marketplace selections are required." }, { status: 400 });
  }

  try {
    const [item, selectedProfile, defaultProfile, rates] = await Promise.all([
      prisma.inventory.findUnique({
        where: { id: inventoryId },
        select: {
          id: true,
          sellingPrice: true,
          costPrice: true,
          purchaseRatePerCarat: true,
          flatPurchaseCost: true,
          weightValue: true,
          imageUrl: true,
          videoUrl: true,
          media: {
            where: { type: { in: ["IMAGE", "VIDEO"] } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            select: { id: true, mediaUrl: true, type: true },
          },
        },
      }),
      getProfileByName(marketplace),
      getDefaultProfile(),
      getCurrencyRates(),
    ]);
    if (!item) return NextResponse.json({ error: "The selected inventory item could not be found." }, { status: 404 });

    const profile = defaultProfile || selectedProfile;
    const purchasePrice = resolvePurchaseCost({
      costPrice: item.costPrice,
      flatPurchaseCost: item.flatPurchaseCost,
      purchaseRatePerCarat: item.purchaseRatePerCarat,
      weightValue: item.weightValue,
    });
    const analysis = profile
      ? analyzePricing({
          purchasePrice,
          sellingPrice: Number(item.sellingPrice) || 0,
          charges: profile.charges,
          marginType: profile.marginType,
          marginValue: profile.marginValue,
        })
      : null;
    const mediaAssets = [
      ...(item.imageUrl ? [{ id: "inventory-image", mediaUrl: item.imageUrl, type: "IMAGE" }] : []),
      ...item.media,
      ...(item.videoUrl ? [{ id: "inventory-video", mediaUrl: item.videoUrl, type: "VIDEO" }] : []),
    ].filter((asset, index, assets) =>
      assets.findIndex((candidate) => candidate.mediaUrl === asset.mediaUrl) === index
    );

    return NextResponse.json({
      marketplace,
      mrp: Number(item.sellingPrice) || 0,
      msp: analysis?.msp ?? null,
      purchasePrice,
      marketplaceFees: analysis?.marketplaceCosts ?? null,
      mediaAssets,
      profileName: profile?.displayName ?? null,
      profileSource: defaultProfile ? "DEFAULT_OPPORTUNITY_PROFILE" : selectedProfile ? "MARKETPLACE" : null,
      currencyRate: marketplace === "EBAY" ? Number(rates.USD) || null : null,
      currencyRateMeaning: "INR per 1 USD",
      pricingEnabled: Boolean(analysis),
      warning: profile
        ? defaultProfile
          ? `MSP uses the Opportunity Report default pricing profile (${defaultProfile.displayName}) so it matches the ERP opportunity calculations.`
          : "No Opportunity Report default profile is configured. MSP is estimated using the selected marketplace profile."
        : "No marketplace pricing profile is configured; MSP cannot be calculated.",
    });
  } catch (error) {
    console.error("[marketplace-listing-pricing] Failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to calculate listing price guidance." },
      { status: 500 }
    );
  }
}

async function prepareListing(input: z.infer<typeof requestSchema>) {
  if (!input.inventoryId) throw new ListingPreparationError("Select an inventory item first.", 400);
  if (!input.template) {
    throw new ListingPreparationError("Select an eBay listing template before preparing this item.", 400);
  }
  const [shop, item, ebaySettingsResult] = await Promise.all([
    prisma.marketplaceShop.findFirst({
      where: {
        id: input.shopId,
        marketplace: "EBAY",
        status: "CONNECTED",
        connection: { status: "CONNECTED" },
      },
      select: { id: true, name: true, externalShopId: true },
    }),
    prisma.inventory.findUnique({
      where: { id: input.inventoryId },
      include: {
        media: {
          where: { type: { in: ["IMAGE", "VIDEO"] } },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, mediaUrl: true, type: true },
        },
        gemstoneCode: { select: { name: true } },
        colorCode: { select: { name: true } },
      },
    }),
    getEbaySettings(),
  ]);

  if (!shop) throw new ListingPreparationError("The selected eBay shop is not connected.", 404);
  if (!item) throw new ListingPreparationError("The selected inventory item could not be found.", 404);
  if (input.title && input.title.length > 80) {
    throw new ListingPreparationError("eBay listing titles must be 80 characters or fewer.", 400);
  }

  if (item.status !== "IN_STOCK") {
    throw new ListingPreparationError("Only inventory items currently in stock can be prepared for listing.");
  }

  const hasCertificateInformation = [
    item.certificateNo,
    item.certificateNumber,
    item.certification,
    item.lab,
    item.certificateLab,
    item.certificateComments,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
  if (!hasCertificateInformation) {
    throw new ListingPreparationError("This item cannot be listed until certificate information is saved in its inventory record.");
  }

  const template = input.template;
  const categoryPath = EBAY_TEMPLATE_CATEGORY_PATHS[template];
  const condition = resolveEbayCondition(item.condition);
  const mediaAssets: ListingMediaAsset[] = [
    ...(item.imageUrl?.trim() ? [{ id: "inventory-image", mediaUrl: item.imageUrl.trim(), type: "IMAGE" }] : []),
    ...item.media.filter((asset) => asset.mediaUrl.trim()),
    ...(item.videoUrl?.trim() ? [{ id: "inventory-video", mediaUrl: item.videoUrl.trim(), type: "VIDEO" }] : []),
  ].filter((asset, index, assets) => assets.findIndex((candidate) => candidate.mediaUrl === asset.mediaUrl) === index);
  const selectedMedia = selectListingMedia(input.mediaUrls, mediaAssets, "EBAY");
  const primaryImage = selectedMedia.find((asset) => asset.type === "IMAGE")?.mediaUrl || null;
  if (!primaryImage) {
    throw new ListingPreparationError("This item cannot be listed until at least one inventory image is available.");
  }
  const settings = ebaySettingsResult.success
    ? ebaySettingsResult.data as EbaySettings
    : null;
  const description = buildEbayHtmlDescription(
    {
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      gemType: item.gemType || item.gemstoneCode?.name,
      color: item.colorCode?.name || item.color,
      shape: item.shape,
      weightValue: item.weightValue,
      weightUnit: item.weightUnit,
      dimensionsMm: item.dimensionsMm,
      treatment: item.treatment,
      origin: item.origin,
      transparency: item.transparency,
      braceletType: item.braceletType,
      beadSizeMm: item.beadSizeMm,
      beadCount: item.beadCount,
      holeSizeMm: item.holeSizeMm,
      innerCircumferenceMm: item.innerCircumferenceMm,
      standardSize: item.standardSize,
      mediaUrl: primaryImage,
      mediaUrls: primaryImage ? [primaryImage] : [],
    },
    {
      includeCertificate: false,
      settings: settings
        ? {
            companyName: settings.companyName || undefined,
            tagline: settings.tagline || undefined,
            brandLogoUrl: settings.brandLogoUrl || undefined,
            globalBannerImages: parseJson(settings.globalBannerImages, []),
            categoryImageUrls: parseJson(settings.categoryImageUrls, {}),
            categoryGemtypeImageUrls: parseJson(settings.categoryGemtypeImageUrls, {}),
          }
        : undefined,
  }
  );

  const unresolved: string[] = [];
  if (!input.price) unresolved.push("Marketplace price");
  if (!primaryImage) unresolved.push("Primary image");
  if (!item.shape && template === "LOOSE_GEMSTONE") unresolved.push("Gemstone shape");
  if (!condition) unresolved.push("eBay condition");

  const existing = await findActiveListingForShop({
    inventoryId: item.id,
    sku: item.sku,
    platform: "EBAY",
    shopId: shop.id,
  });

  return {
    inventory: {
      id: item.id,
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      gemType: item.gemType || item.gemstoneCode?.name || null,
      color: item.colorCode?.name || item.color || null,
      shape: item.shape,
      aspectSource: {
        category: item.category,
        gemType: item.gemType || item.gemstoneCode?.name || null,
        stoneType: item.stoneType,
        color: item.color,
        colorName: item.colorCode?.name || null,
        shape: item.shape,
        clarity: item.clarity,
        clarityGrade: item.clarityGrade,
        cut: item.cut,
        cutGrade: item.cutGrade,
        treatment: item.treatment,
        origin: item.origin,
        originCountry: item.originCountry,
        weightValue: item.weightValue,
        weightUnit: item.weightUnit,
        carats: item.carats,
        pieces: item.pieces,
        braceletType: item.braceletType,
        standardSize: item.standardSize,
        brandName: settings?.companyName || null,
      },
      imageUrl: primaryImage,
      mediaAssets: selectedMedia,
    },
    shop,
    template,
    categoryPath,
    condition,
    format: "Fixed price",
    duration: "Good 'Til Cancelled",
    title: input.title || listingTitle(item),
    description,
    price: input.price ?? null,
    currency: input.currency.toUpperCase(),
    unresolved,
    existing,
    publishAvailable: false,
    publishBlockedReason: "eBay publishing remains blocked until write authorization, category requirements, shop policies, and API validation are in place.",
  };
}

async function saveEtsyPriceDraft(input: z.infer<typeof requestSchema>) {
  if (!input.inventoryId) throw new ListingPreparationError("Select an inventory item before saving the Etsy draft.", 400);
  if (!input.regionalPrices) {
    throw new ListingPreparationError("Enter all three Etsy listing prices before saving.", 400);
  }
  if (!input.etsyListingDetails) {
    throw new ListingPreparationError("Complete the required Etsy listing details before saving.", 400);
  }
  const attributeNames = input.etsyListingDetails.categoryAttributes.map((attribute) => attribute.name.trim().toLocaleLowerCase());
  if (new Set(attributeNames).size !== attributeNames.length) {
    throw new ListingPreparationError("Etsy category attribute names must be unique.", 400);
  }

  const [shop, item] = await Promise.all([
    prisma.marketplaceShop.findFirst({
      where: {
        id: input.shopId,
        marketplace: "ETSY",
        status: "CONNECTED",
        connection: { status: "CONNECTED" },
      },
      select: {
        id: true,
        name: true,
        connectionId: true,
        externalShopId: true,
        connection: { select: { scopes: true } },
      },
    }),
    prisma.inventory.findUnique({
      where: { id: input.inventoryId },
      select: {
        id: true,
        sku: true,
        itemName: true,
        category: true,
        status: true,
        imageUrl: true,
        videoUrl: true,
        certificateNo: true,
        certificateNumber: true,
        certification: true,
        lab: true,
        certificateLab: true,
        certificateComments: true,
        gemType: true,
        stoneType: true,
        color: true,
        shape: true,
        origin: true,
        treatment: true,
        carats: true,
        weightValue: true,
        weightUnit: true,
        braceletType: true,
        beadSizeMm: true,
        beadCount: true,
        standardSize: true,
        media: {
          where: { type: { in: ["IMAGE", "VIDEO"] } },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, mediaUrl: true, type: true },
        },
      },
    }),
  ]);

  if (!shop) throw new ListingPreparationError("The selected Etsy shop is not connected.", 404);
  if (!hasOAuthScope(shop.connection.scopes, "listings_w")) {
    throw new ListingPreparationError("Reconnect the selected Etsy shop and approve the listings_w permission before creating marketplace drafts.", 403);
  }
  if (!input.etsyListingDetails.taxonomyId) {
    throw new ListingPreparationError("Choose an Etsy category returned by the Etsy API before saving.", 400);
  }
  const etsyOptions = await new EtsyConnector().getListingPreparationOptions(
    shop.connectionId,
    shop.externalShopId,
    input.etsyListingDetails.taxonomyId
  );
  const selectedCategory = etsyOptions.categories.find((category) => category.taxonomyId === input.etsyListingDetails?.taxonomyId);
  if (!selectedCategory || selectedCategory.path !== input.etsyListingDetails.categoryName) {
    throw new ListingPreparationError("The Etsy category no longer matches the current Etsy taxonomy. Reload requirements and choose it again.", 422);
  }
  const categoryMatchesProduct = input.etsyListingDetails.productType === "LOOSE_GEMSTONE"
    ? /gemstone|gem\b|loose|stone/i.test(selectedCategory.path)
    : /bracelet/i.test(selectedCategory.path);
  if (!categoryMatchesProduct) {
    throw new ListingPreparationError("Choose an Etsy taxonomy category that matches the selected product type.", 422);
  }
  const attributesByName = new Map(input.etsyListingDetails.categoryAttributes.map((attribute) => [
    attribute.name.trim().toLocaleLowerCase(),
    attribute.value.trim(),
  ]));
  const missingCategoryAttributes = etsyOptions.properties
    .filter((property) => property.required && !attributesByName.get(property.name.toLocaleLowerCase()))
    .map((property) => property.name);
  const invalidCategoryAttributes = etsyOptions.properties
    .filter((property) => property.values.length && attributesByName.has(property.name.toLocaleLowerCase()))
    .filter((property) => !property.values.some((value) => value.name.toLocaleLowerCase() === attributesByName.get(property.name.toLocaleLowerCase())?.toLocaleLowerCase()))
    .map((property) => property.name);
  const invalidPropertyIds = input.etsyListingDetails.categoryAttributes
    .filter((attribute) => attribute.propertyId)
    .filter((attribute) => {
      const property = etsyOptions.properties.find((candidate) => candidate.id === attribute.propertyId);
      if (!property) return true;
      if (!attribute.valueId) return false;
      return !property.values.some((option) => option.id === attribute.valueId && option.name === attribute.value);
    });
  const unknownCategoryAttributes = [...attributesByName.keys()].filter(
    (name) => !etsyOptions.properties.some((property) => property.name.toLocaleLowerCase() === name)
      && !/^(gemstone|carat weight|raw stone|carved|faceted|lab created|cabochon|banded|polished|stone source|shape|drill style)$/.test(name)
  );
  const selectedSectionIsAvailable = !input.etsyListingDetails.shopSectionId
    || etsyOptions.sections.some((section) => section.id === input.etsyListingDetails?.shopSectionId);
  if (missingCategoryAttributes.length || invalidCategoryAttributes.length || unknownCategoryAttributes.length || invalidPropertyIds.length) {
    throw new ListingPreparationError(
      missingCategoryAttributes.length
        ? `Complete Etsy-required category fields: ${missingCategoryAttributes.join(", ")}.`
        : invalidCategoryAttributes.length
          ? `Choose a current Etsy-provided value for: ${invalidCategoryAttributes.join(", ")}.`
          : "One or more Etsy category property IDs or values are no longer valid. Check requirements again.",
      422
    );
  }
  if (!selectedSectionIsAvailable) {
    throw new ListingPreparationError("The selected Etsy shop section is no longer available. Reload shop sections and select it again.", 422);
  }
  if (!item) throw new ListingPreparationError("The selected inventory item could not be found.", 404);
  if (item.status !== "IN_STOCK") {
    throw new ListingPreparationError("Only inventory items currently in stock can be prepared for Etsy.");
  }
  const availableMedia: ListingMediaAsset[] = [
    ...(item.imageUrl?.trim() ? [{ id: "inventory-image", mediaUrl: item.imageUrl.trim(), type: "IMAGE" }] : []),
    ...item.media.filter((asset) => asset.mediaUrl.trim()),
    ...(item.videoUrl?.trim() ? [{ id: "inventory-video", mediaUrl: item.videoUrl.trim(), type: "VIDEO" }] : []),
  ].filter((asset, index, assets) => assets.findIndex((candidate) => candidate.mediaUrl === asset.mediaUrl) === index);
  const selectedMedia = selectListingMedia(input.mediaUrls, availableMedia, "ETSY");
  if (!selectedMedia.some((asset) => asset.type === "IMAGE")) {
    throw new ListingPreparationError("This item cannot be prepared until at least one inventory image is available.");
  }
  const hasCertificateInformation = [
    item.certificateNo,
    item.certificateNumber,
    item.certification,
    item.lab,
    item.certificateLab,
    item.certificateComments,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
  if (!hasCertificateInformation) {
    throw new ListingPreparationError("This item cannot be prepared until certificate information is saved in its inventory record.");
  }

  if (input.title && input.title.length > 140) {
    throw new ListingPreparationError("Etsy listing titles must be 140 characters or fewer.", 400);
  }
  const certificateValues = [
    item.certificateNo,
    item.certificateNumber,
    item.certificateComments,
  ].filter((value): value is string => typeof value === "string" && value.trim().length >= 3);
  const listingCopy = [
    input.title || "",
    input.etsyListingDetails.description,
    ...input.etsyListingDetails.tags,
    ...input.etsyListingDetails.categoryAttributes.flatMap((attribute) => [attribute.name, attribute.value]),
  ].join("\n").toLocaleLowerCase();
  const containsCertificateValue = certificateValues.some((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (normalized.length <= 5) {
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(listingCopy);
    }
    return listingCopy.includes(normalized);
  });
  if (containsCertificateValue) {
    throw new ListingPreparationError("Remove certificate numbers or private report identifiers from the Etsy title, description, tags, and attributes. Certification authority names may be included; other certificate details must remain private.", 400);
  }
  if (input.etsyListingDetails.tags.length > 13) {
    throw new ListingPreparationError("Etsy supports at most 13 listing tags.", 400);
  }
  const activeListing = await findActiveListingForShop({
    inventoryId: item.id,
    sku: item.sku,
    platform: "ETSY",
    shopId: shop.id,
  });
  if (activeListing) {
    throw new ListingPreparationError(`This inventory item already has an active Etsy listing in the selected shop (${activeListing.status}).`, 409);
  }

  const draftMetadata = {
    source: "MARKETPLACE_LISTING_ENGINE",
    preparationStatus: "ETSY_MANUAL_REGIONAL_PRICES",
    descriptionStatus: "MANUALLY_PREPARED",
    validationStatus: "NOT_VALIDATED",
    etsyListingDetails: input.etsyListingDetails,
    offerPercent: input.offerPercent,
    discountedRegionalPricesInr: {
      india: Number((input.regionalPrices.india * (1 - input.offerPercent / 100)).toFixed(2)),
      us: Number((input.regionalPrices.us * (1 - input.offerPercent / 100)).toFixed(2)),
      global: Number((input.regionalPrices.global * (1 - input.offerPercent / 100)).toFixed(2)),
    },
    regionalPrices: {
      india: { amount: input.regionalPrices.india, currency: "INR" },
      us: { amount: input.regionalPrices.us, currency: "INR" },
      global: { amount: input.regionalPrices.global, currency: "INR" },
    },
    mediaAssets: selectedMedia.map((asset) => ({ url: asset.mediaUrl, type: asset.type })),
    note: "This listing is created as an unpublished Etsy draft. Review it in Etsy, add any missing media or details, and publish it there.",
  };
  const draftData = {
    inventoryId: item.id,
    platform: "ETSY",
    listedPrice: input.regionalPrices.india,
    currency: "INR",
    status: "DRAFT",
    listedDate: new Date(),
    marketplaceShopId: shop.id,
    marketplaceShopName: shop.name,
    listingSku: item.sku,
    marketplaceTitle: input.title || listingTitle(item).slice(0, 140),
    marketplacePrice: input.regionalPrices.india,
    marketplaceQuantity: input.etsyListingDetails.quantity,
    syncStatus: "DRAFT",
    rawMetadata: JSON.stringify(draftMetadata),
  };

  const existingDraft = await prisma.listing.findFirst({
    where: {
      inventoryId: item.id,
      platform: "ETSY",
      marketplaceShopId: shop.id,
      status: "DRAFT",
      syncStatus: "DRAFT",
      rawMetadata: { contains: '"source":"MARKETPLACE_LISTING_ENGINE"' },
    },
    select: { id: true, externalId: true },
  });
  if (existingDraft?.externalId) {
    throw new ListingPreparationError("An Etsy marketplace draft already exists for this item and shop. Continue editing it in Etsy instead of creating a duplicate.", 409);
  }

  const etsy = new EtsyConnector();
  const shopCurrency = await etsy.getShopCurrencyCode(shop.connectionId, shop.externalShopId);
  const rates = await getCurrencyRates();
  const shopCurrencyRate = rates[shopCurrency] || 0;
  const regionalPriceInr = shopCurrency === "INR"
    ? input.regionalPrices.india
    : shopCurrency === "USD"
      ? input.regionalPrices.us
      : input.regionalPrices.global;
  const etsyPrice = shopCurrency === "INR"
    ? regionalPriceInr
    : shopCurrencyRate > 0
      ? regionalPriceInr / shopCurrencyRate
      : null;
  if (etsyPrice === null || !Number.isFinite(etsyPrice) || etsyPrice <= 0) {
    throw new ListingPreparationError(
      `A current INR-per-${shopCurrency} conversion rate is not configured for the selected Etsy shop.`,
      422
    );
  }

  const remoteDraft = await etsy.createMarketplaceDraft(shop.connectionId, shop.externalShopId, {
    draftSettings: input.draftSettings,
    title: input.title || listingTitle(item).slice(0, 140),
    description: input.etsyListingDetails.description,
    quantity: input.etsyListingDetails.quantity,
    price: etsyPrice,
    taxonomyId: input.etsyListingDetails.taxonomyId,
    shopSectionId: input.etsyListingDetails.shopSectionId || undefined,
    whoMade: input.etsyListingDetails.whoMade,
    whenMade: input.etsyListingDetails.whenMade,
    isSupply: input.etsyListingDetails.whatIsIt === "SUPPLY_OR_TOOL",
    tags: input.etsyListingDetails.tags,
    categoryAttributes: input.etsyListingDetails.categoryAttributes,
    media: selectedMedia.flatMap((asset) => asset.type === "IMAGE" || asset.type === "VIDEO"
      ? [{ mediaUrl: asset.mediaUrl, type: asset.type }]
      : []),
  });
  const marketplaceDraftMetadata = {
    ...draftMetadata,
    marketplaceDraft: {
      id: remoteDraft.listingId,
      draftSettings: remoteDraft.draftSettings,
      state: "DRAFT",
      uploadedMedia: remoteDraft.uploadedMedia,
      warnings: remoteDraft.warnings,
    },
  };
  const persistedDraftData = {
    ...draftData,
    externalId: remoteDraft.listingId,
    syncError: remoteDraft.warnings.length ? remoteDraft.warnings.join("; ") : null,
    rawMetadata: JSON.stringify(marketplaceDraftMetadata),
  };
  const draft = existingDraft
    ? await prisma.listing.update({
        where: { id: existingDraft.id },
        data: persistedDraftData,
        select: { id: true },
      })
    : await prisma.listing.create({
        data: persistedDraftData,
        select: { id: true },
      });
  return {
    draftId: draft.id,
    externalListingId: remoteDraft.listingId,
    uploadedMedia: remoteDraft.uploadedMedia,
    warnings: remoteDraft.warnings,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid listing preparation request.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "shopSettings") {
      const shop = await prisma.marketplaceShop.findFirst({
        where: { id: parsed.data.shopId, marketplace: { in: ["EBAY", "ETSY"] }, status: "CONNECTED", connection: { status: "CONNECTED" } },
        select: { connectionId: true, externalShopId: true, marketplace: true },
      });
      if (!shop) throw new ListingPreparationError("The selected marketplace shop is not connected.", 404);
      const groups = shop.marketplace === "EBAY"
        ? await new EbayConnector().getDraftSettingGroups(shop.connectionId)
        : await new EtsyConnector().getDraftSettingGroups(shop.connectionId, shop.externalShopId);
      return NextResponse.json({ groups });
    }
    if (parsed.data.action === "etsyRequirements") {
      const shop = await prisma.marketplaceShop.findFirst({
        where: {
          id: parsed.data.shopId,
          marketplace: "ETSY",
          status: "CONNECTED",
          connection: { status: "CONNECTED" },
        },
        select: { connectionId: true, externalShopId: true },
      });
      if (!shop) throw new ListingPreparationError("The selected Etsy shop is not connected.", 404);
      const [options, inventoryItem] = await Promise.all([
        new EtsyConnector().getListingPreparationOptions(
          shop.connectionId,
          shop.externalShopId,
          parsed.data.etsyTaxonomyId
        ),
        parsed.data.inventoryId
          ? prisma.inventory.findUnique({
              where: { id: parsed.data.inventoryId },
              select: {
                itemName: true,
                gemType: true,
                stoneType: true,
                color: true,
                shape: true,
                weightValue: true,
                weightUnit: true,
                carats: true,
                origin: true,
                originCountry: true,
                treatment: true,
                holeSizeMm: true,
                beadSizeMm: true,
                braceletType: true,
              },
            })
          : Promise.resolve(null),
      ]);
      const itemForSuggestions = inventoryItem
        ? { ...inventoryItem, carats: inventoryItem.carats || 0 }
        : null;
      const propertySuggestions = itemForSuggestions
        ? Object.fromEntries(options.properties.flatMap((property) => {
            const suggestion = suggestEtsyInventoryAttribute(property.name, itemForSuggestions, property.values);
            return suggestion ? [[property.name, suggestion]] : [];
          }))
        : {};
      return NextResponse.json({ ...options, propertySuggestions });
    }

    if (parsed.data.action === "saveEtsyPriceDraft") {
      if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
        return NextResponse.json({ error: "You do not have permission to save an Etsy price draft." }, { status: 403 });
      }
      return NextResponse.json(await saveEtsyPriceDraft(parsed.data));
    }

    if (parsed.data.action === "validateEbay") {
      const prepared = await prepareListing(parsed.data);
      const shop = await prisma.marketplaceShop.findFirst({
        where: {
          id: parsed.data.shopId,
          marketplace: "EBAY",
          status: "CONNECTED",
          connection: { status: "CONNECTED" },
        },
        select: { connectionId: true },
      });
      if (!shop) throw new ListingPreparationError("The selected eBay shop is not connected.", 404);

      const taxonomy = await new EbayConnector().getCategoryAspects(
        shop.connectionId,
        prepared.categoryPath,
        "EBAY_US",
        parsed.data.categoryId
      );
      const sensitiveAspectsExcluded = [
        ...taxonomy.requiredAspects,
        ...taxonomy.optionalAspects,
      ].filter((aspect) => isSensitiveEbayCertificateAspect(aspect.name)).length;
      const requiredAspects = taxonomy.requiredAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name));
      const optionalAspects = taxonomy.optionalAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name));
      const erpSuggestions = Object.fromEntries(requiredAspects.flatMap((aspect) => {
        const inventoryValue = suggestEbayInventoryAspect(aspect.name, prepared.inventory.aspectSource);
        if (!inventoryValue) return [];
        const canonicalValue = aspect.values.find((value) => value.toLowerCase() === inventoryValue.toLowerCase());
        if (canonicalValue) return [[aspect.name, canonicalValue]];
        return aspect.mode === "SELECTION_ONLY" ? [] : [[aspect.name, inventoryValue]];
      }));
      const optionalErpSuggestions = Object.fromEntries(optionalAspects.flatMap((aspect) => {
        const inventoryValue = suggestEbayInventoryAspect(aspect.name, prepared.inventory.aspectSource);
        if (!inventoryValue) return [];
        const canonicalValue = aspect.values.find((value) => value.toLowerCase() === inventoryValue.toLowerCase());
        if (canonicalValue) return [[aspect.name, canonicalValue]];
        return aspect.mode === "SELECTION_ONLY" ? [] : [[aspect.name, inventoryValue]];
      }));
      const defaultPrefix = "marketplace_listing_default_ebay_";
      const defaults = await prisma.setting.findMany({
        where: { key: { startsWith: defaultPrefix } },
        select: { key: true, value: true },
      });
      return NextResponse.json({
        marketplaceId: taxonomy.marketplaceId,
        categoryId: taxonomy.categoryId,
        categoryPath: taxonomy.categoryPath,
        suggestions: taxonomy.suggestions,
        requiredAspects,
        optionalAspects,
        erpSuggestions,
        optionalErpSuggestions,
        sensitiveAspectsExcluded,
        sensitiveRequiredAspectsExcluded: taxonomy.requiredAspects.filter((aspect) => isSensitiveEbayCertificateAspect(aspect.name)).length,
        savedDefaults: Object.fromEntries(defaults.map((entry) => [
          decodeURIComponent(entry.key.slice(defaultPrefix.length)),
          entry.value,
        ])),
        inventoryId: prepared.inventory.id,
        template: prepared.template,
        exactCategoryResolved: Boolean(taxonomy.categoryId),
        apiValidationComplete: false,
        publishBlockedReason: taxonomy.categoryId
          ? "Taxonomy requirements were loaded. Saving will create an unpublished offer using the selected shop policies; complete any remaining seller checks in eBay before publishing."
          : "The configured template category did not exactly match an eBay Taxonomy suggestion. Select or map the correct category before continuing.",
      });
    }

    const prepared = await prepareListing(parsed.data);
    if (parsed.data.action === "prepare") return NextResponse.json(prepared);

    if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
      return NextResponse.json({ error: "You do not have permission to save a listing draft." }, { status: 403 });
    }
    if (!parsed.data.price) {
      return NextResponse.json({ error: "Enter a marketplace price before saving this draft." }, { status: 400 });
    }
    if (!parsed.data.usdToInr) {
      return NextResponse.json({ error: "Enter a valid INR-per-USD rate before saving the eBay draft." }, { status: 400 });
    }
    const ebayShop = await prisma.marketplaceShop.findFirst({
      where: { id: parsed.data.shopId, marketplace: "EBAY", status: "CONNECTED", connection: { status: "CONNECTED" } },
      select: { connectionId: true, connection: { select: { scopes: true } } },
    });
    if (!ebayShop) throw new ListingPreparationError("The selected eBay shop is not connected.", 404);
    if (!(await new EbayConnector().ensureInventoryWriteScope(ebayShop.connectionId, ebayShop.connection.scopes))) {
      throw new ListingPreparationError("Reconnect the selected eBay shop and approve the sell.inventory permission before creating marketplace drafts.", 403);
    }
    const taxonomy = await new EbayConnector().getCategoryAspects(
      ebayShop.connectionId,
      prepared.categoryPath,
      "EBAY_US",
      parsed.data.categoryId
    );
    if (!taxonomy.categoryId) {
      return NextResponse.json({ error: "The configured template category could not be matched to eBay Taxonomy. Resolve the category before saving this draft." }, { status: 422 });
    }
    const excludedSensitiveAspects = [
      ...taxonomy.requiredAspects,
      ...taxonomy.optionalAspects,
    ].filter((aspect) => isSensitiveEbayCertificateAspect(aspect.name));
    const requiredAspects = taxonomy.requiredAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name));
    const optionalAspects = taxonomy.optionalAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name));
    const aspectValues = new Map(parsed.data.aspectValues.map(({ name, value }) => [name, value.trim()]));
    const missingAspects = requiredAspects
      .filter((aspect) => !aspectValues.get(aspect.name))
      .map((aspect) => aspect.name);
    const invalidSelectionAspects = requiredAspects
      .concat(optionalAspects)
      .filter((aspect) =>
        Boolean(aspectValues.get(aspect.name))
        &&
        aspect.mode === "SELECTION_ONLY"
        && !aspect.values.includes(aspectValues.get(aspect.name) || "")
      )
      .map((aspect) => aspect.name);
    const providedUnknownAspects = [...aspectValues.keys()].filter(
      (name) => !requiredAspects.concat(optionalAspects).some((aspect) => aspect.name === name)
    );
    if (missingAspects.length || invalidSelectionAspects.length || providedUnknownAspects.length) {
      return NextResponse.json({
        error: missingAspects.length
          ? `Complete the required eBay fields: ${missingAspects.join(", ")}.`
          : invalidSelectionAspects.length
            ? `Choose an eBay-provided value for: ${invalidSelectionAspects.join(", ")}.`
          : "The supplied eBay fields do not match the current category requirements. Revalidate the category.",
        missingAspects,
        invalidSelectionAspects,
      }, { status: 422 });
    }
    if (prepared.existing) {
      return NextResponse.json(
        { error: "This inventory item already has an active eBay listing in the selected shop.", existing: prepared.existing },
        { status: 409 }
      );
    }
    if (!prepared.condition) {
      throw new ListingPreparationError("Choose a valid eBay condition on the inventory item before creating its marketplace draft.", 422);
    }

    const draftData = {
      inventoryId: prepared.inventory.id,
      platform: "EBAY",
      listedPrice: parsed.data.price,
      currency: prepared.currency,
      status: "DRAFT",
      listedDate: new Date(),
      marketplaceShopId: prepared.shop.id,
      marketplaceShopName: prepared.shop.name,
      listingSku: prepared.inventory.sku,
      marketplaceTitle: prepared.title,
      marketplacePrice: parsed.data.price,
      marketplaceQuantity: 1,
      syncStatus: "DRAFT",
      rawMetadata: JSON.stringify({
        source: "MARKETPLACE_LISTING_ENGINE",
        template: prepared.template,
        categoryPath: taxonomy.categoryPath,
        configuredCategoryPath: prepared.categoryPath,
        format: prepared.format,
        duration: prepared.duration,
        description: prepared.description,
        unresolved: prepared.unresolved,
        mediaAssets: prepared.inventory.mediaAssets.map((asset) => ({ url: asset.mediaUrl, type: asset.type })),
        ebayTaxonomy: {
          marketplaceId: taxonomy.marketplaceId,
          categoryId: taxonomy.categoryId,
          categoryPath: taxonomy.categoryPath,
          requiredAspectValues: Object.fromEntries(aspectValues),
          excludedSensitiveAspectCount: excludedSensitiveAspects.length,
          validationStatus: "INTERNAL_REQUIRED_ASPECTS_CAPTURED",
          sellerWriteValidationStatus: "NOT_RUN",
        },
        pricePreview: {
          usdToInr: parsed.data.usdToInr,
          offerPercent: parsed.data.offerPercent,
          priceBeforeOfferInr: Number((parsed.data.price * parsed.data.usdToInr).toFixed(2)),
          estimatedSalePriceInr: Number(
            (calculateDiscountedInr(parsed.data.price, parsed.data.usdToInr, parsed.data.offerPercent) || 0).toFixed(2)
          ),
          comparison: "Compare estimated discounted gross sale price to the current UI pricing guidance; review marketplace fees and shipping before publishing.",
        },
      }),
    };
    const existingDraft = await prisma.listing.findFirst({
      where: {
        inventoryId: prepared.inventory.id,
        platform: "EBAY",
        marketplaceShopId: prepared.shop.id,
        externalId: null,
        status: "DRAFT",
        rawMetadata: { contains: '"source":"MARKETPLACE_LISTING_ENGINE"' },
      },
      select: { id: true, rawMetadata: true },
    });
    if (existingDraft && getMarketplaceDraftId(existingDraft.rawMetadata)) {
      throw new ListingPreparationError("An eBay marketplace draft already exists for this item and shop. Continue editing it in Seller Hub instead of creating a duplicate.", 409);
    }
    const mediaForMarketplace: Array<{ mediaUrl: string; type: "IMAGE" | "VIDEO" }> = prepared.inventory.mediaAssets.flatMap((asset) =>
      asset.type === "IMAGE" || asset.type === "VIDEO"
        ? [{ mediaUrl: asset.mediaUrl, type: asset.type }]
        : []
    );
    const remoteDraft = await new EbayConnector().createMarketplaceDraft(ebayShop.connectionId, {
      draftSettings: parsed.data.draftSettings,
      sku: prepared.inventory.sku,
      title: prepared.title,
      description: prepared.description,
      categoryId: taxonomy.categoryId,
      marketplaceId: taxonomy.marketplaceId,
      price: parsed.data.price,
      currency: prepared.currency,
      quantity: 1,
      condition: prepared.condition,
      aspects: Object.fromEntries([...aspectValues.entries()].map(([name, value]) => [name, [value]])),
      media: mediaForMarketplace,
    });
    const draftMetadata = JSON.parse(draftData.rawMetadata) as Record<string, unknown>;
    const persistedDraftData = {
      ...draftData,
      rawMetadata: JSON.stringify({
        ...draftMetadata,
        marketplaceDraft: {
          id: remoteDraft.offerId,
          draftSettings: remoteDraft.draftSettings,
          state: "UNPUBLISHED",
          uploadedMedia: remoteDraft.uploadedMedia,
          warnings: remoteDraft.warnings,
        },
        note: "An unpublished eBay offer draft was created. Review it in Seller Hub, add any missing media or details, and publish it there.",
      }),
      syncError: remoteDraft.warnings.length ? remoteDraft.warnings.join("; ") : null,
    };
    const draft = existingDraft
      ? await prisma.listing.update({
          where: { id: existingDraft.id },
          data: persistedDraftData,
          select: { id: true },
        })
      : await prisma.listing.create({
          data: persistedDraftData,
          select: { id: true },
        });

    const defaultsPrefix = "marketplace_listing_default_ebay_";
    await Promise.all([...aspectValues.entries()].map(([name, value]) =>
        prisma.setting.upsert({
          where: { key: `${defaultsPrefix}${encodeURIComponent(name)}` },
          create: {
            key: `${defaultsPrefix}${encodeURIComponent(name)}`,
            value,
            description: `Reusable eBay listing default for ${name}`,
          },
          update: { value, description: `Reusable eBay listing default for ${name}` },
        })
    ));

    return NextResponse.json({
      draftId: draft.id,
      externalListingId: remoteDraft.offerId,
      uploadedMedia: remoteDraft.uploadedMedia,
      warnings: remoteDraft.warnings,
      unresolved: prepared.unresolved,
    });
  } catch (error) {
    if (error instanceof DraftSettingsError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof ListingPreparationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: `Marketplace rejected the listing request. ${error.message}` },
        { status: error.status === 400 || error.status === 422 ? 422 : 502 }
      );
    }
    console.error("[marketplace-listing-preparation] Failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to prepare the marketplace listing." },
      { status: 500 }
    );
  }
}
