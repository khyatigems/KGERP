"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Image as ImageIcon, Loader2, Sparkles, Video } from "lucide-react";
import { buildMarketplaceTitle, InventoryPicker } from "@/components/listings/inventory-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EBAY_TEMPLATE_CATEGORY_PATHS } from "@/lib/marketplace/listing-preparation";
import { calculateDiscountedInr, isBelowMinimumPrice } from "@/lib/marketplace/price-preview";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

type PreparedListing = {
  inventory: {
    id: string;
    sku: string;
    itemName: string;
    category: string;
    gemType: string | null;
    color: string | null;
    shape: string | null;
    imageUrl: string | null;
    mediaAssets: Array<{ id: string; mediaUrl: string; type: "IMAGE" | "VIDEO" }>;
  };
  template: "LOOSE_GEMSTONE" | "JEWELRY";
  categoryPath: string;
  condition: string | null;
  format: string;
  duration: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  unresolved: string[];
  existing: { externalId: string | null; listingUrl: string | null; status: string } | null;
  publishAvailable: boolean;
  publishBlockedReason: string;
};

type Shop = { id: string; name: string; writeReady: boolean };
type SelectedInventory = {
  id: string;
  sku: string;
  itemName: string;
  category: string | null;
  gemType: string | null;
  color: string | null;
  shape: string | null;
  sellingPrice: number | null;
  imageUrl: string | null;
  weightValue: number | null;
  weightUnit: string | null;
  etsyDescription: string | null;
};
type PricingGuidance = {
  mrp: number;
  msp: number | null;
  purchasePrice: number;
  marketplaceFees: number | null;
  mediaAssets: Array<{ id: string; mediaUrl: string; type: "IMAGE" | "VIDEO" }>;
  profileName: string | null;
  profileSource: "MARKETPLACE" | "DEFAULT_OPPORTUNITY_PROFILE" | null;
  currencyRate: number | null;
  currencyRateMeaning: string;
  pricingEnabled: boolean;
  warning: string | null;
};
type SavedDraft = {
  id: string;
  externalId?: string | null;
  sku: string;
  itemName: string;
  title: string;
  shop: string;
  platform: string;
  syncError?: string | null;
  price: number;
  currency: string;
  regionalPrices?: { india: number; us: number; global: number } | null;
  updatedAt: string;
};
type EtsyListingDetails = {
  productType: "LOOSE_GEMSTONE" | "BRACELET" | "";
  categoryName: string;
  taxonomyId: string;
  shopSectionId: string;
  description: string;
  craftType: string;
  whoMade: "I_DID" | "SHOP_MEMBER" | "ANOTHER_COMPANY_OR_PERSON" | "";
  whatIsIt: "FINISHED_PRODUCT" | "SUPPLY_OR_TOOL" | "";
  whenMade: string;
  productionMethod: "MADE_FROM_SCRATCH" | "ASSEMBLED" | "ALTERED" | "CURATED_SET" | "NATURAL_MATERIAL" | "";
  toolsUsed: string[];
  tags: string;
  quantity: string;
};
type EtsyCategory = { taxonomyId: string; name: string; path: string };
type EtsyProperty = { id: string; name: string; required: boolean; values: Array<{ id: string | null; name: string }>; supportsVariations: boolean };
type EtsyPreparationOptions = {
  categories: EtsyCategory[];
  sections: Array<{ id: string; title: string }>;
  sensitivePropertiesExcluded: number;
  propertySuggestions: Record<string, string>;
  properties: EtsyProperty[];
};

type EtsyGemstoneAttributes = {
  gemstone: string;
  caratWeight: string;
  rawStone: string;
  carved: string;
  faceted: string;
  labCreated: string;
  cabochon: string;
  banded: string;
  polished: string;
  stoneSource: string;
  shape: string;
  drillStyle: string;
};

const EMPTY_ETSY_LISTING_DETAILS: EtsyListingDetails = {
  productType: "",
  categoryName: "",
  taxonomyId: "",
  shopSectionId: "",
  description: "",
  craftType: "",
  whoMade: "",
  whatIsIt: "",
  whenMade: "",
  productionMethod: "",
  toolsUsed: [],
  tags: "",
  quantity: "",
};

const EMPTY_ETSY_GEMSTONE_ATTRIBUTES: EtsyGemstoneAttributes = {
  gemstone: "",
  caratWeight: "",
  rawStone: "",
  carved: "",
  faceted: "",
  labCreated: "",
  cabochon: "",
  banded: "",
  polished: "",
  stoneSource: "",
  shape: "",
  drillStyle: "",
};

const ETSY_GEMSTONE_ATTRIBUTE_LABELS: Record<keyof EtsyGemstoneAttributes, string> = {
  gemstone: "Gemstone",
  caratWeight: "Carat weight",
  rawStone: "Raw stone",
  carved: "Carved",
  faceted: "Faceted",
  labCreated: "Lab created",
  cabochon: "Cabochon",
  banded: "Banded",
  polished: "Polished",
  stoneSource: "Stone source",
  shape: "Shape",
  drillStyle: "Drill style",
};

function normalizeEtsyAttributeName(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalEtsyAttributeName(value: string): string {
  const name = normalizeEtsyAttributeName(value);
  const aliases: Record<string, string> = {
    "gem type": "gemstone",
    "gemstone type": "gemstone",
    "main stone": "gemstone",
    "primary color": "color",
    "gemstone color": "color",
    "gemstone shape": "shape",
    "stone shape": "shape",
    "carat weight": "weight",
    "gemstone weight": "weight",
    "country of origin": "origin",
    "stone source": "origin",
    "gemstone treatment": "treatment",
  };
  return aliases[name] || name;
}

function findPreferredEtsyCategory(
  categories: EtsyCategory[],
  productType: EtsyListingDetails["productType"]
): EtsyCategory | null {
  const matching = categories.filter((category) => productType === "LOOSE_GEMSTONE"
    ? /gemstone|gem\b|loose|stone/i.test(category.path)
    : productType === "BRACELET"
      ? /bracelet/i.test(category.path)
      : false);
  const preferredLeaf = productType === "LOOSE_GEMSTONE"
    ? /^(loose gemstones?|gemstones?)$/i
    : /^bracelets?$/i;
  return matching.find((category) => preferredLeaf.test(category.name.trim()))
    || matching.find((category) => preferredLeaf.test(category.path.split(">").at(-1)?.trim() || ""))
    || matching[0]
    || null;
}

type EbayAspect = {
  name: string;
  mode: string;
  values: string[];
  cardinality: string | null;
  required?: boolean;
};
type EbayCategorySuggestion = { categoryId: string; categoryPath: string };
type EbayTaxonomy = {
  marketplaceId: string;
  categoryId: string | null;
  categoryPath: string | null;
  suggestions: EbayCategorySuggestion[];
  requiredAspects: EbayAspect[];
  optionalAspects: EbayAspect[];
  erpSuggestions: Record<string, string>;
  optionalErpSuggestions: Record<string, string>;
  sensitiveAspectsExcluded: number;
  sensitiveRequiredAspectsExcluded: number;
  savedDefaults: Record<string, string>;
  exactCategoryResolved: boolean;
  apiValidationComplete: false;
  publishBlockedReason: string;
};
function EbayAspectField({
  aspect,
  value,
  savedValue,
  suggested,
  custom,
  onValueChange,
  onCustomChange,
}: {
  aspect: EbayAspect;
  value: string;
  savedValue?: string;
  suggested?: string;
  custom: boolean;
  onValueChange: (value: string) => void;
  onCustomChange: (value: boolean) => void;
}) {
  const canType = aspect.mode !== "SELECTION_ONLY";
  const savedValueConflictsWithInventory = Boolean(
    savedValue
    && suggested
    && savedValue.trim().toLocaleLowerCase() !== suggested.trim().toLocaleLowerCase()
  );
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`ebay-aspect-${aspect.name}`}>
          {aspect.name}{aspect.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {suggested
            ? "ERP suggestion; review before saving."
            : aspect.required
              ? "Not found in inventory; this required field must be completed."
              : "Optional eBay field; fill it when the information is known."}
        </p>
      </div>
      {canType && aspect.values.length > 0 ? (
        <div className="space-y-2">
          <Select
            value={custom ? "__custom__" : value || "__none__"}
            onValueChange={(selection) => {
              if (selection === "__custom__") {
                onCustomChange(true);
                onValueChange("");
              } else {
                onCustomChange(false);
                onValueChange(selection === "__none__" ? "" : selection);
              }
            }}
          >
            <SelectTrigger id={`ebay-aspect-${aspect.name}`}><SelectValue placeholder="Select or enter a value" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{aspect.required ? "Select a value" : "Not specified"}</SelectItem>
              {aspect.values.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              <SelectItem value="__custom__">Enter a different value</SelectItem>
            </SelectContent>
          </Select>
          {custom && (
            <Input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={savedValue ? `Saved default: ${savedValue}` : aspect.required ? "Enter required value" : "Optional"}
            />
          )}
          {savedValue && !savedValueConflictsWithInventory && (
            <Button type="button" variant="outline" size="sm" onClick={() => {
              onCustomChange(!aspect.values.includes(savedValue));
              onValueChange(savedValue);
            }}>
              Use saved value
            </Button>
          )}
          {savedValueConflictsWithInventory && (
            <p className="text-xs text-amber-700">
              Saved value “{savedValue}” was not applied because inventory says “{suggested}”.
            </p>
          )}
        </div>
      ) : canType ? (
        <div className="space-y-2">
          <Input
            id={`ebay-aspect-${aspect.name}`}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={savedValue ? `Saved default: ${savedValue}` : aspect.required ? "Enter required value" : "Optional"}
          />
          {savedValue && !savedValueConflictsWithInventory && (
            <Button type="button" variant="outline" onClick={() => onValueChange(savedValue)}>
              Use saved
            </Button>
          )}
          {savedValueConflictsWithInventory && (
            <p className="text-xs text-amber-700">
              Saved value “{savedValue}” was not applied because inventory says “{suggested}”.
            </p>
          )}
        </div>
      ) : (
        <Select value={value || "__none__"} onValueChange={(selection) => onValueChange(selection === "__none__" ? "" : selection)}>
          <SelectTrigger id={`ebay-aspect-${aspect.name}`}>
            <SelectValue placeholder={aspect.required ? "Select required value" : "Optional — choose if known"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{aspect.required ? "Select a value" : "Not specified"}</SelectItem>
            {aspect.values.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {aspect.cardinality === "MULTI" && <p className="text-xs text-muted-foreground">This aspect accepts multiple values; enter them separated by commas.</p>}
    </div>
  );
}

export function ListingPreparationClient({
  ebayShops,
  etsyShops,
  drafts,
}: {
  ebayShops: Shop[];
  etsyShops: Shop[];
  drafts: SavedDraft[];
}) {
  const router = useRouter();
  const [marketplace, setMarketplace] = useState<"EBAY" | "ETSY" | null>(null);
  const [inventoryId, setInventoryId] = useState("");
  const [selectedInventory, setSelectedInventory] = useState<SelectedInventory | null>(null);
  const [shopId, setShopId] = useState("");
  const [template, setTemplate] = useState<"LOOSE_GEMSTONE" | "JEWELRY" | null>(null);
  const [listingTitle, setListingTitle] = useState("");
  const [price, setPrice] = useState("");
  const [etsyPrices, setEtsyPrices] = useState({ india: "", us: "", global: "" });
  const [etsyOfferPercent, setEtsyOfferPercent] = useState("0");
  const [etsyListingDetails, setEtsyListingDetails] = useState<EtsyListingDetails>(EMPTY_ETSY_LISTING_DETAILS);
  const [etsyGemstoneAttributes, setEtsyGemstoneAttributes] = useState<EtsyGemstoneAttributes>(EMPTY_ETSY_GEMSTONE_ATTRIBUTES);
  const [etsyPreparationOptions, setEtsyPreparationOptions] = useState<EtsyPreparationOptions | null>(null);
  const [etsyCategorySearch, setEtsyCategorySearch] = useState("");
  const [etsyCategoryAttributesByName, setEtsyCategoryAttributesByName] = useState<Record<string, string>>({});
  const [etsyRequirementsChecked, setEtsyRequirementsChecked] = useState(false);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingGuidance | null>(null);
  const [pricingError, setPricingError] = useState("");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [usdToInr, setUsdToInr] = useState("");
  const [offerPercent, setOfferPercent] = useState("0");
  const [prepared, setPrepared] = useState<PreparedListing | null>(null);
  const [taxonomy, setTaxonomy] = useState<EbayTaxonomy | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [aspectValues, setAspectValues] = useState<Record<string, string>>({});
  const [customAspectValues, setCustomAspectValues] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const prepareSequence = useRef(0);
  const draftsSectionRef = useRef<HTMLDivElement>(null);
  const listingTitleRef = useRef(listingTitle);
  listingTitleRef.current = listingTitle;
  const selectedMediaRef = useRef(selectedMediaUrls);
  selectedMediaRef.current = selectedMediaUrls;
  const activeShops = marketplace === "EBAY" ? ebayShops : marketplace === "ETSY" ? etsyShops : [];
  const selectedShop = activeShops.find((shop) => shop.id === shopId);
  const discountedPriceInr = calculateDiscountedInr(
    Number(price),
    Number(usdToInr),
    Number(offerPercent)
  );
  const belowMsp = isBelowMinimumPrice(discountedPriceInr, pricing?.msp ?? null);
  const selectedMediaAssets = pricing?.mediaAssets.filter((asset) => selectedMediaUrls.includes(asset.mediaUrl)) || [];
  const maxMarketplacePhotos = marketplace === "EBAY" ? 24 : 20;
  const maxMarketplaceVideos = marketplace === "EBAY" ? 1 : 2;
  const hasSelectedMarketplacePhoto = selectedMediaAssets.some((asset) => asset.type === "IMAGE");
  const etsyTags = etsyListingDetails.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const manualEtsyCategoryAttributes = [
    ...Object.entries(etsyCategoryAttributesByName)
      .filter(([, value]) => value.trim())
        .map(([name, value]) => {
          const property = etsyPreparationOptions?.properties.find((candidate) => candidate.name === name);
          const option = property?.values.find((candidate) => candidate.name === value.trim());
          return {
            name,
            value: value.trim(),
            ...(property ? { propertyId: property.id } : {}),
            ...(option?.id ? { valueId: option.id } : {}),
          };
        }),
  ];
  const etsyApiPropertyNames = new Set((etsyPreparationOptions?.properties || []).map((property) => canonicalEtsyAttributeName(property.name)));
  const preparedEtsyCategoryAttributes = [
    ...manualEtsyCategoryAttributes,
    ...(etsyListingDetails.productType === "LOOSE_GEMSTONE"
      ? (Object.keys(ETSY_GEMSTONE_ATTRIBUTE_LABELS) as Array<keyof EtsyGemstoneAttributes>).flatMap((name) => {
          const value = etsyGemstoneAttributes[name].trim();
          const label = ETSY_GEMSTONE_ATTRIBUTE_LABELS[name];
          return value && !etsyApiPropertyNames.has(canonicalEtsyAttributeName(label)) ? [{ name: label, value }] : [];
        })
      : []),
  ];
  const apiMappedGemstoneAttributes = new Set(
    (etsyPreparationOptions?.properties || [])
      .map((property) => canonicalEtsyAttributeName(property.name))
  );
  const visibleEtsyGemstoneOptionKeys = (Object.keys(ETSY_GEMSTONE_ATTRIBUTE_LABELS) as Array<keyof EtsyGemstoneAttributes>)
    .filter((key) => !apiMappedGemstoneAttributes.has(canonicalEtsyAttributeName(ETSY_GEMSTONE_ATTRIBUTE_LABELS[key])));
  const ebayOptionalActions = taxonomy?.optionalAspects
    .filter((aspect) => !aspectValues[aspect.name]?.trim())
    .map((aspect) => `Optional eBay field: ${aspect.name} (not specified)`) || [];
  const preparedReviewActions = [...new Set([...(prepared?.unresolved || []), ...ebayOptionalActions])];
  const etsyDiscountFactor = Math.max(0, 1 - (Number(etsyOfferPercent) || 0) / 100);
  const etsyDiscountedPricesInr = {
    india: Number(etsyPrices.india) > 0 ? Number(etsyPrices.india) * etsyDiscountFactor : null,
    us: Number(etsyPrices.us) > 0 ? Number(etsyPrices.us) * etsyDiscountFactor : null,
    global: Number(etsyPrices.global) > 0 ? Number(etsyPrices.global) * etsyDiscountFactor : null,
  };
  const etsyBelowMspRegions = pricing?.msp == null
    ? []
    : Object.entries(etsyDiscountedPricesInr)
        .filter((entry): entry is [string, number] => entry[1] !== null && entry[1] < (pricing.msp as number))
        .map(([region]) => region);
  const etsyCategoryAttributeNames = preparedEtsyCategoryAttributes.map((attribute) => attribute.name.trim().toLocaleLowerCase());
  const etsyCategoryAttributesUnique = new Set(etsyCategoryAttributeNames).size === etsyCategoryAttributeNames.length;
  const etsyMissingRequiredProperties = etsyPreparationOptions?.properties
    .filter((property) => property.required && !etsyCategoryAttributesByName[property.name]?.trim())
    .map((property) => property.name) || [];
  const filteredEtsyCategories = etsyPreparationOptions?.categories
    .filter((category) => {
      const path = category.path.toLocaleLowerCase();
      const matchesType = etsyListingDetails.productType === "LOOSE_GEMSTONE"
        ? /gemstone|gem\b|loose|stone/.test(path)
        : etsyListingDetails.productType === "BRACELET"
          ? /bracelet/.test(path)
          : true;
      return matchesType && path.includes(etsyCategorySearch.toLocaleLowerCase());
    })
    .slice(0, 250) || [];
  const etsyDetailsComplete = Boolean(
    etsyListingDetails.productType
    && etsyListingDetails.categoryName.trim()
    && etsyListingDetails.taxonomyId
    && listingTitle.trim()
    && etsyListingDetails.description.trim()
    && etsyListingDetails.craftType.trim()
    && etsyListingDetails.whoMade
    && etsyListingDetails.whatIsIt
    && etsyListingDetails.whenMade
    && Number(etsyListingDetails.quantity) > 0
    && Number.isInteger(Number(etsyListingDetails.quantity))
    && etsyTags.length <= 13
    && etsyTags.every((tag) => tag.length <= 30)
    && etsyCategoryAttributesUnique
    && preparedEtsyCategoryAttributes.length <= 40
    && etsyRequirementsChecked
    && !etsyMissingRequiredProperties.length
  );
  const etsyDiscountValid = Number.isFinite(Number(etsyOfferPercent))
    && Number(etsyOfferPercent) >= 0
    && Number(etsyOfferPercent) <= 99.99;
  const etsyReviewChecks = [
    { label: "Etsy shop selected", complete: marketplace === "ETSY" && Boolean(shopId) },
    { label: "Eligible inventory item selected", complete: Boolean(inventoryId) },
    { label: "Etsy category selected", complete: Boolean(etsyListingDetails.taxonomyId && etsyListingDetails.categoryName.trim()) },
    { label: "Etsy requirements checked", complete: etsyRequirementsChecked },
    {
      label: etsyRequirementsChecked && etsyMissingRequiredProperties.length
        ? `Required attributes: ${etsyMissingRequiredProperties.join(", ")}`
        : "Required category attributes complete",
      complete: etsyRequirementsChecked && etsyMissingRequiredProperties.length === 0,
    },
    { label: "Listing title entered", complete: Boolean(listingTitle.trim()) },
    { label: "Plain-text description entered", complete: Boolean(etsyListingDetails.description.trim()) },
    {
      label: "Seller, item, and quantity details complete",
      complete: Boolean(etsyListingDetails.craftType.trim()
        && etsyListingDetails.whoMade
        && etsyListingDetails.whatIsIt
        && etsyListingDetails.whenMade
        && Number(etsyListingDetails.quantity) > 0
        && Number.isInteger(Number(etsyListingDetails.quantity))),
    },
    { label: "At least one product photo selected", complete: hasSelectedMarketplacePhoto },
    {
      label: "India, US, and Global prices entered in INR",
      complete: [etsyPrices.india, etsyPrices.us, etsyPrices.global].every((value) => Number(value) > 0),
    },
    { label: "Running discount is valid (0–99.99%)", complete: etsyDiscountValid },
    { label: "Tags meet Etsy limits", complete: etsyTags.length <= 13 && etsyTags.every((tag) => tag.length <= 30) },
  ];
  const etsyPendingChecks = etsyReviewChecks.filter((check) => !check.complete);
  const missingRequiredAspects = taxonomy?.requiredAspects.filter((aspect) => !aspectValues[aspect.name]?.trim()) || [];
  const aspectValuesValid = Boolean(
    taxonomy?.exactCategoryResolved
    && !missingRequiredAspects.length
    && taxonomy.requiredAspects.every((aspect) =>
      aspect.mode !== "SELECTION_ONLY"
      || !aspectValues[aspect.name]
      || aspect.values.includes(aspectValues[aspect.name])
    )
    && taxonomy.optionalAspects.every((aspect) =>
      aspect.mode !== "SELECTION_ONLY"
      || !aspectValues[aspect.name]
      || aspect.values.includes(aspectValues[aspect.name])
    )
  );

  useEffect(() => {
    if (!inventoryId || !marketplace) {
      setPricing(null);
      setPricingError("");
      setSelectedMediaUrls([]);
      return;
    }
    const controller = new AbortController();
    const loadPricing = async () => {
      setPricingLoading(true);
      setPricingError("");
      try {
        const query = new URLSearchParams({ inventoryId, marketplace });
        const response = await fetch(`/api/marketplace/listing-preparation?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to calculate MSP/MRP.");
        setPricing(payload as PricingGuidance);
        const mediaAssets = payload.mediaAssets as PricingGuidance["mediaAssets"];
        setSelectedMediaUrls(mediaAssets?.filter((asset) => asset.type === "IMAGE").slice(0, 1).map((asset) => asset.mediaUrl) || []);
        if (marketplace === "EBAY" && payload.currencyRate) {
          setUsdToInr(String(payload.currencyRate));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPricing(null);
        setPricingError(error instanceof Error ? error.message : "Unable to calculate MSP/MRP.");
      } finally {
        if (!controller.signal.aborted) setPricingLoading(false);
      }
    };
    void loadPricing();
    return () => controller.abort();
  }, [inventoryId, marketplace]);

  const prepare = useCallback(async () => {
    if (marketplace !== "EBAY" || !inventoryId || !shopId || !template) {
      return;
    }
    const sequence = ++prepareSequence.current;
    setBusy(true);
    try {
      const response = await fetch("/api/marketplace/listing-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          inventoryId,
          shopId,
          template,
            ...(listingTitleRef.current.trim() ? { title: listingTitleRef.current.trim() } : {}),
            mediaUrls: selectedMediaRef.current,
          ...(price ? { price: Number(price) } : {}),
          currency: "USD",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to prepare listing.");
      if (sequence !== prepareSequence.current) return;
      setPrepared(payload as PreparedListing);
      setTemplate(payload.template);
    } catch (error) {
      if (sequence === prepareSequence.current) {
        setPrepared(null);
        toast.error(error instanceof Error ? error.message : "Unable to prepare listing.");
      }
    } finally {
      if (sequence === prepareSequence.current) setBusy(false);
    }
  }, [inventoryId, marketplace, price, shopId, template]);

  const validateEbayTaxonomy = async () => {
    if (marketplace !== "EBAY" || !inventoryId || !shopId || !template) return;
    setBusy(true);
    setTaxonomy(null);
    try {
      const response = await fetch("/api/marketplace/listing-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validateEbay",
          inventoryId,
          shopId,
          template,
          ...(categoryId ? { categoryId } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load eBay category requirements.");
      const result = payload as EbayTaxonomy;
      setTaxonomy(result);
      setCategoryId(result.categoryId || "");
      setTemplate(payload.template);
      setCustomAspectValues(Object.fromEntries([...result.requiredAspects, ...result.optionalAspects].map((aspect) => {
        const suggestion = result.erpSuggestions[aspect.name] || result.optionalErpSuggestions[aspect.name];
        return [
          aspect.name,
          Boolean(
            suggestion
            && aspect.mode !== "SELECTION_ONLY"
            && aspect.values.length
            && !aspect.values.includes(suggestion)
          ),
        ];
      })));
      setAspectValues(Object.fromEntries([...result.requiredAspects, ...result.optionalAspects].map((aspect) => [
        aspect.name,
        result.erpSuggestions[aspect.name] || result.optionalErpSuggestions[aspect.name] || "",
      ])));
      if (!result.exactCategoryResolved) {
        toast.error("Choose the matching eBay category returned by Taxonomy, then check it again.");
      } else {
        toast.success(`Loaded ${result.requiredAspects.length} required eBay category fields from Taxonomy.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load eBay category requirements.");
    } finally {
      setBusy(false);
    }
  };

  const checkEtsyRequirements = async () => {
    if (marketplace !== "ETSY" || !shopId || !etsyListingDetails.productType) return;
    setBusy(true);
    try {
      if (!etsyPreparationOptions?.categories.length) {
        const response = await fetch("/api/marketplace/listing-preparation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "etsyRequirements", shopId }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load Etsy categories and shop sections.");
        const options = payload as EtsyPreparationOptions;
        const preferredCategory = findPreferredEtsyCategory(options.categories, etsyListingDetails.productType);
        if (!preferredCategory) {
          setEtsyPreparationOptions(options);
          throw new Error("Etsy did not return a matching category. Search and select the correct category manually.");
        }
        setEtsyPreparationOptions(options);
        setEtsyListingDetails((previous) => ({
          ...previous,
          taxonomyId: preferredCategory.taxonomyId,
          categoryName: preferredCategory.path,
        }));
        setEtsyCategoryAttributesByName({});
        setEtsyRequirementsChecked(false);
        toast.success("Etsy categories loaded and a matching category was selected. Choose a shop section if needed, then check requirements.");
        return;
      }
      if (!etsyListingDetails.taxonomyId) {
        throw new Error("Select an Etsy category before checking its listing requirements.");
      }
      const response = await fetch("/api/marketplace/listing-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "etsyRequirements",
          shopId,
          inventoryId: inventoryId || undefined,
          etsyTaxonomyId: etsyListingDetails.taxonomyId || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load Etsy categories and requirements.");
      const options = payload as EtsyPreparationOptions;
      setEtsyPreparationOptions(options);
      setEtsyRequirementsChecked(true);
      setEtsyCategoryAttributesByName((previous) => {
        const next = { ...previous };
        for (const property of options.properties) {
          if (!next[property.name]?.trim()) next[property.name] = options.propertySuggestions[property.name] || "";
        }
        return next;
      });
      toast.success(`Checked Etsy category requirements: ${options.properties.filter((property) => property.required).length} required and ${options.properties.filter((property) => !property.required).length} optional attributes. Inventory suggestions were applied where Etsy permits the values.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load Etsy requirements.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!inventoryId || !shopId) return;
    const timer = window.setTimeout(() => void prepare(), 250);
    return () => {
      window.clearTimeout(timer);
      prepareSequence.current += 1;
    };
  }, [inventoryId, shopId, template, price, prepare]);

  const resetListingForm = () => {
    setMarketplace(null);
    setInventoryId("");
    setSelectedInventory(null);
    setShopId("");
    setTemplate(null);
    setListingTitle("");
    setPrice("");
    setEtsyPrices({ india: "", us: "", global: "" });
    setEtsyOfferPercent("0");
    setEtsyListingDetails(EMPTY_ETSY_LISTING_DETAILS);
    setEtsyPreparationOptions(null);
    setEtsyCategorySearch("");
    setEtsyCategoryAttributesByName({});
    setEtsyRequirementsChecked(false);
    setSelectedMediaUrls([]);
    setEtsyGemstoneAttributes(EMPTY_ETSY_GEMSTONE_ATTRIBUTES);
    setPricing(null);
    setPricingError("");
    setUsdToInr("");
    setOfferPercent("0");
    setPrepared(null);
    setTaxonomy(null);
    setCategoryId("");
    setAspectValues({});
    setCustomAspectValues({});
  };

  const returnToSavedDrafts = () => {
    resetListingForm();
    router.refresh();
    window.setTimeout(() => draftsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const toggleMarketplaceMedia = (url: string) => {
    if (selectedMediaUrls.includes(url)) {
      setSelectedMediaUrls((previous) => previous.filter((selected) => selected !== url));
      return;
    }
    const asset = pricing?.mediaAssets.find((candidate) => candidate.mediaUrl === url);
    if (!asset) {
      toast.error("This media file is no longer attached to the selected inventory item.");
      return;
    }
    const sameTypeCount = selectedMediaAssets.filter((selected) => selected.type === asset.type).length;
    const typeLimit = asset.type === "IMAGE" ? maxMarketplacePhotos : maxMarketplaceVideos;
    if (sameTypeCount >= typeLimit) {
      toast.error(`You can select at most ${typeLimit} ${asset.type === "IMAGE" ? "photos" : "videos"} for ${marketplace === "EBAY" ? "eBay" : "Etsy"}.`);
      return;
    }
    setSelectedMediaUrls((previous) => previous.includes(url) ? previous : [...previous, url]);
  };

  const saveDraft = async () => {
    if (marketplace !== "EBAY" || !inventoryId || !shopId || !template || !price || !usdToInr || Number(offerPercent) >= 100) {
      toast.error("Enter a marketplace price, valid INR-per-USD rate, and offer below 100% before saving.");
      return;
    }
    if (!listingTitle.trim()) {
      toast.error("Enter an eBay listing title before saving.");
      return;
    }
    if (!aspectValuesValid) {
      toast.error("Load eBay Taxonomy requirements and complete every required category field before saving.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/marketplace/listing-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveDraft",
          inventoryId,
          shopId,
          template,
          title: listingTitle.trim(),
          price: Number(price),
          currency: "USD",
          usdToInr: Number(usdToInr),
          offerPercent: Number(offerPercent),
          categoryId: taxonomy?.categoryId,
          aspectValues: Object.entries(aspectValues).map(([name, value]) => ({ name, value })),
          mediaUrls: selectedMediaUrls,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save draft.");
      if (Array.isArray(payload.warnings) && payload.warnings.length) {
        toast.warning(`eBay draft ${payload.externalListingId} was created, but some media needs attention: ${payload.warnings.join("; ")}`);
      } else {
        toast.success("Unpublished eBay draft created in the selected shop with selected media.");
      }
      returnToSavedDrafts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setBusy(false);
    }
  };

  const saveEtsyPriceDraft = async () => {
    if (!inventoryId || !shopId || !etsyPrices.india || !etsyPrices.us || !etsyPrices.global
      || !Number.isFinite(Number(etsyOfferPercent)) || Number(etsyOfferPercent) < 0 || Number(etsyOfferPercent) > 99.99) {
      toast.error("Enter all three Etsy regional prices in INR and a valid discount from 0% to 99.99%.");
      return;
    }
    if (!etsyDetailsComplete || !hasSelectedMarketplacePhoto) {
      toast.error("Complete every required Etsy listing field and select at least one product photo.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/marketplace/listing-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveEtsyPriceDraft",
          inventoryId,
          shopId,
          title: listingTitle.trim(),
          mediaUrls: selectedMediaUrls,
          regionalPrices: {
            india: Number(etsyPrices.india),
            us: Number(etsyPrices.us),
            global: Number(etsyPrices.global),
          },
          etsyListingDetails: {
            ...etsyListingDetails,
            categoryName: etsyListingDetails.categoryName.trim(),
            description: etsyListingDetails.description.trim(),
            craftType: etsyListingDetails.craftType.trim(),
            productionMethod: etsyListingDetails.productionMethod || undefined,
            tags: etsyTags,
            quantity: Number(etsyListingDetails.quantity),
            categoryAttributes: preparedEtsyCategoryAttributes,
          },
          offerPercent: Number(etsyOfferPercent),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save Etsy listing draft.");
      if (Array.isArray(payload.warnings) && payload.warnings.length) {
        toast.warning(`Etsy draft ${payload.externalListingId} was created, but some attributes or media need attention: ${payload.warnings.join("; ")}`);
      } else {
        toast.success("Unpublished Etsy draft created in the selected shop with selected media.");
      }
      returnToSavedDrafts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save Etsy listing draft.");
    } finally {
      setBusy(false);
    }
  };

  const ebayPriceComplete = Number(price) > 0 && Number(usdToInr) > 0 && Number(offerPercent) >= 0 && Number(offerPercent) < 100;
  const etsyPriceComplete = Number(etsyPrices.india) > 0
    && Number(etsyPrices.us) > 0
    && Number(etsyPrices.global) > 0
    && Number.isFinite(Number(etsyOfferPercent))
    && Number(etsyOfferPercent) >= 0
    && Number(etsyOfferPercent) <= 99.99;
  const workflowSteps = [
    { number: "01", title: "Marketplace & shop", description: "Choose the marketplace and destination account.", complete: Boolean(marketplace && shopId) },
    { number: "02", title: marketplace === "EBAY" ? "Template" : marketplace === "ETSY" ? "Etsy category" : "Template or category", description: marketplace === "EBAY" ? "Select the appropriate eBay template." : marketplace === "ETSY" ? "Choose product type and enter the Etsy category." : "Select a marketplace first.", complete: marketplace === "EBAY" ? Boolean(template) : marketplace === "ETSY"     && Boolean(etsyListingDetails.productType && etsyListingDetails.categoryName.trim() && etsyListingDetails.taxonomyId && etsyRequirementsChecked) },
    { number: "03", title: "Inventory", description: "Choose ready inventory not active in this shop.", complete: Boolean(inventoryId) },
    { number: "04", title: "ERP check", description: "Review the inventory data and pricing.", complete: Boolean(inventoryId && !pricingLoading && pricing) },
    { number: "05", title: "Required fields", description: "Fill marketplace-required listing data.", complete: marketplace === "EBAY" ? aspectValuesValid && Boolean(listingTitle.trim()) : marketplace === "ETSY" && etsyDetailsComplete },
    { number: "06", title: "Price", description: "Enter listing-specific prices.", complete: marketplace === "EBAY" ? ebayPriceComplete : etsyPriceComplete },
    { number: "07", title: "Marketplace validation", description: "Seller-side checks need marketplace write access.", complete: false },
  ];
  const activeWorkflowStep = workflowSteps.findIndex((step) => !step.complete);

  return (
    <div className="w-full max-w-none space-y-6 pb-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Marketplace operations</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Create Listings</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Prepare marketplace-specific product data from eligible inventory, review what still needs attention, and keep private certificate numbers and report identifiers out of listing content.
            </p>
          </div>
          {marketplace === "EBAY" && selectedShop && !selectedShop.writeReady && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
              This eBay connection does not include the <code className="rounded bg-background px-1 py-0.5">sell.inventory</code> write scope. Reconnect it before creating marketplace drafts.
            </div>
          )}
          <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Saves an unpublished draft to the selected shop · publish there when ready
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {workflowSteps.map((step, index) => {
          const isActive = index === activeWorkflowStep && !step.complete;
          const status = step.complete ? "Complete" : isActive ? "In progress" : "Not started";
          return (
            <div
              key={step.number}
              aria-current={isActive ? "step" : undefined}
              className={`flex gap-3 rounded-xl border p-3 ${step.complete ? "border-emerald-600/30 bg-emerald-600/5" : isActive ? "border-primary/60 bg-primary/5 ring-1 ring-primary/15" : "bg-card"}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${step.complete ? "border-emerald-600 bg-emerald-600 text-white" : isActive ? "border-primary bg-background text-primary" : "border-muted bg-muted text-muted-foreground"}`}>
                {step.complete ? <CheckCircle2 className="h-4 w-4" /> : step.number}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${step.complete ? "text-emerald-700" : isActive ? "text-primary" : "text-muted-foreground"}`}>{status}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.8fr)]">
        <div className="space-y-6">
          <div ref={draftsSectionRef} className="scroll-mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Saved marketplace drafts <span className="text-sm font-normal text-muted-foreground">({drafts.length})</span></CardTitle>
                <CardDescription>New drafts are created in the selected marketplace shop. Older ERP-only drafts are identified below.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraftsExpanded((expanded) => !expanded)} aria-expanded={draftsExpanded}>
                {draftsExpanded ? "Hide drafts" : "View drafts"}
                {draftsExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CardHeader>
            {draftsExpanded && <CardContent>
              {drafts.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <p className="text-sm font-medium">No marketplace drafts yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Saved marketplace drafts will appear here for review.</p>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-xs text-muted-foreground">Review these drafts in the selected eBay or Etsy shop, add any missing details or media there, and publish when ready.</p>
                  <div className="divide-y rounded-lg border">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{draft.title}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{draft.platform}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{draft.itemName} · {draft.sku} · {draft.shop}</p>
                        {draft.externalId
                          ? <p className="mt-1 text-[10px] text-muted-foreground">Marketplace draft ID · {draft.externalId}</p>
                          : <p className="mt-1 text-[10px] text-amber-700">ERP-only draft · not sent to marketplace</p>}
                        {draft.syncError && <p className="mt-1 max-w-xl text-[10px] text-amber-700">{draft.syncError}</p>}
                      </div>
                      <div className="text-right">
                          {draft.regionalPrices ? (
                            <div className="space-y-0.5 text-xs">
                              <p>India · INR {draft.regionalPrices.india.toFixed(2)}</p>
                              <p>US · INR {draft.regionalPrices.us.toFixed(2)}</p>
                              <p>Global · INR {draft.regionalPrices.global.toFixed(2)}</p>
                            </div>
                          ) : (
                            <p className="font-medium">{draft.currency} {draft.price.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{draft.updatedAt.slice(0, 10)}</p>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </CardContent>}
          </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listing workflow</CardTitle>
              <CardDescription>Choose the marketplace, shop, and its category or template before selecting qualifying inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="marketplace">1. Marketplace</Label>
                  <Select value={marketplace || ""} onValueChange={(value: "EBAY" | "ETSY") => {
                    setMarketplace(value);
                    setTemplate(null);
                    setShopId("");
                    setInventoryId("");
                    setSelectedInventory(null);
                    setListingTitle("");
                    setPrepared(null);
                    setTaxonomy(null);
                    setCategoryId("");
                    setAspectValues({});
                    setCustomAspectValues({});
                    setPrice("");
                    setPricing(null);
                    setPricingError("");
                    setUsdToInr("");
                    setOfferPercent("0");
                    setEtsyPrices({ india: "", us: "", global: "" });
                    setEtsyOfferPercent("0");
                    setEtsyOfferPercent("0");
                    setEtsyListingDetails(EMPTY_ETSY_LISTING_DETAILS);
                    setEtsyGemstoneAttributes(EMPTY_ETSY_GEMSTONE_ATTRIBUTES);
                    setEtsyPreparationOptions(null);
                    setEtsyCategorySearch("");
                    setEtsyCategoryAttributesByName({});
                    setEtsyRequirementsChecked(false);
                  }}>
                    <SelectTrigger id="marketplace"><SelectValue placeholder="Select marketplace" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EBAY">eBay</SelectItem>
                      <SelectItem value="ETSY">Etsy</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Marketplace prices are independent from the ERP selling price.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marketplace-shop">Connected {marketplace === "EBAY" ? "eBay" : marketplace === "ETSY" ? "Etsy" : "marketplace"} shop</Label>
                  <Select disabled={!marketplace} value={shopId} onValueChange={(value) => {
                    setShopId(value);
                    setInventoryId("");
                    setSelectedInventory(null);
                    setListingTitle("");
                    setPrice("");
                    setEtsyPrices({ india: "", us: "", global: "" });
                    setEtsyListingDetails(EMPTY_ETSY_LISTING_DETAILS);
                    setEtsyGemstoneAttributes(EMPTY_ETSY_GEMSTONE_ATTRIBUTES);
                    setSelectedMediaUrls([]);
                    setEtsyPreparationOptions(null);
                    setEtsyCategorySearch("");
                    setEtsyCategoryAttributesByName({});
                    setEtsyRequirementsChecked(false);
                    setPricing(null);
                    setPricingError("");
                    setPrepared(null);
                    setTaxonomy(null);
                    setCategoryId("");
                    setAspectValues({});
                    setCustomAspectValues({});
                  }}>
                    <SelectTrigger id="marketplace-shop"><SelectValue placeholder={marketplace ? "Select connected shop" : "Select marketplace first"} /></SelectTrigger>
                    <SelectContent>
                      {activeShops.map((shop) => <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {marketplace && activeShops.length === 0 && (
                    <p className="text-xs text-destructive">
                      No connected {marketplace === "EBAY" ? "eBay" : "Etsy"} shop is available. Check Settings → Marketplace Connections.
                    </p>
                  )}
                </div>
              </div>

              {marketplace === "ETSY" ? (
                <>
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold">
                    {!selectedShop
                      ? "Select a connected Etsy shop to check listing access"
                      : selectedShop.writeReady
                        ? "Etsy listing-write access is available"
                        : "Etsy listing-write access is not available"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedShop?.writeReady
                      ? <>The selected shop has the <code className="rounded bg-background px-1 py-0.5 text-xs">listings_w</code> permission. Saving creates an unpublished Etsy draft and uploads selected media; this ERP will not publish it.</>
                      : selectedShop
                        ? <>The selected shop does not have the <code className="rounded bg-background px-1 py-0.5 text-xs">listings_w</code> permission. Reconnect this shop and approve listing access before creating marketplace drafts.</>
                        : "Choose the Etsy shop you want to prepare a listing for."}
                  </p>
                </div>
                <div className="space-y-4 rounded-xl border p-4">
                  <p className="text-sm font-semibold">2. Etsy product type and category</p>
                  <p className="text-xs text-muted-foreground">
                    Load category and shop-section choices from Etsy, select the exact taxonomy category, then check its required and optional attributes.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="etsy-product-type">Product type <span className="text-destructive">*</span></Label>
                      <Select
                        value={etsyListingDetails.productType || "__none__"}
                        onValueChange={(value) => {
                          const productType = value === "__none__" ? "" : value as EtsyListingDetails["productType"];
                          const preferredCategory = etsyPreparationOptions
                            ? findPreferredEtsyCategory(etsyPreparationOptions.categories, productType)
                            : null;
                          setEtsyListingDetails((previous) => ({
                            ...previous,
                            productType,
                            categoryName: preferredCategory?.path || "",
                            taxonomyId: preferredCategory?.taxonomyId || "",
                            shopSectionId: "",
                          }));
                          setEtsyCategoryAttributesByName({});
                          setEtsyRequirementsChecked(false);
                          setEtsyPreparationOptions((previous) => previous ? { ...previous, properties: [] } : previous);
                        }}
                      >
                        <SelectTrigger id="etsy-product-type"><SelectValue placeholder="Select product type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select product type</SelectItem>
                          <SelectItem value="LOOSE_GEMSTONE">Loose gemstone</SelectItem>
                          <SelectItem value="BRACELET">Bracelet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-category-name">Etsy category <span className="text-destructive">*</span></Label>
                      <Input
                        id="etsy-category-search"
                        value={etsyCategorySearch}
                        onChange={(event) => setEtsyCategorySearch(event.target.value)}
                        placeholder={etsyPreparationOptions ? "Search Etsy categories" : "Load Etsy categories first"}
                        disabled={!etsyPreparationOptions}
                      />
                      <select
                        id="etsy-category-name"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={etsyListingDetails.taxonomyId}
                        disabled={!etsyPreparationOptions}
                        onChange={(event) => {
                          const category = etsyPreparationOptions?.categories.find((candidate) => candidate.taxonomyId === event.target.value);
                          setEtsyListingDetails((previous) => ({
                            ...previous,
                            taxonomyId: category?.taxonomyId || "",
                            categoryName: category?.path || "",
                          }));
                          setEtsyCategoryAttributesByName({});
                          setEtsyRequirementsChecked(false);
                          setEtsyPreparationOptions((previous) => previous ? { ...previous, properties: [] } : previous);
                        }}
                      >
                        <option value="">Select category returned by Etsy</option>
                        {filteredEtsyCategories.map((category) => (
                          <option key={category.taxonomyId} value={category.taxonomyId}>{category.path}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Etsy taxonomy categories are filtered by product type. Search results show up to 250 matches; refine the search if the desired category is not listed.
                      </p>
                      {etsyPreparationOptions?.sections && (
                        <div className="space-y-2">
                          <Label htmlFor="etsy-shop-section">Shop section (optional)</Label>
                          <Select
                            value={etsyListingDetails.shopSectionId || "__none__"}
                            onValueChange={(value) => setEtsyListingDetails((previous) => ({
                              ...previous,
                              shopSectionId: value === "__none__" ? "" : value,
                            }))}
                          >
                            <SelectTrigger id="etsy-shop-section"><SelectValue placeholder="Select shop section" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No shop section</SelectItem>
                              {etsyPreparationOptions.sections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button type="button" size="sm" variant="outline" onClick={() => void checkEtsyRequirements()} disabled={busy || !shopId || !etsyListingDetails.productType}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {etsyPreparationOptions?.categories.length ? "Check Etsy requirements" : "Load Etsy categories & shop sections"}
                      </Button>
                    </div>
                  </div>
                </div>
                {shopId ? (
                  <div className="space-y-2">
                    <Label>3. Eligible inventory item</Label>
                    <InventoryPicker
                      value={inventoryId}
                      marketplaceReadyOnly
                      marketplace="ETSY"
                      shopId={shopId}
                      onSelect={(id, item) => {
                        setInventoryId(id);
                        setSelectedInventory(item ? { ...item, id } : null);
                        setListingTitle(item ? buildMarketplaceTitle(item, "ETSY") : "");
                        setEtsyPrices({ india: "", us: "", global: "" });
                        setEtsyListingDetails((previous) => ({
                          ...previous,
                          description: item?.etsyDescription || "",
                        }));
                        setEtsyCategoryAttributesByName({});
                        setEtsyRequirementsChecked(false);
                        setEtsyPreparationOptions((previous) => previous ? {
                          ...previous,
                          propertySuggestions: {},
                        } : null);
                        const caratUnit = item?.weightUnit?.trim().toLocaleLowerCase();
                        const hasCaratWeight = Boolean(
                          item?.weightValue
                          && caratUnit
                          && ["ct", "cts", "carat", "carats"].includes(caratUnit)
                        );
                        setEtsyGemstoneAttributes({
                          ...EMPTY_ETSY_GEMSTONE_ATTRIBUTES,
                          gemstone: item?.gemType || "",
                          caratWeight: hasCaratWeight ? String(item?.weightValue) : "",
                          shape: item?.shape || "",
                        });
                        setSelectedMediaUrls([]);
                        setPrepared(null);
                      }}
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Select an Etsy shop first; inventory already listed or saved as a draft for that shop will be excluded.</p>
                )}
                {etsyPreparationOptions?.properties.length ? (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Etsy category attributes</h3>
                      <p className="text-xs text-muted-foreground">
                        These fields and allowed choices were fetched for the selected Etsy category. Required fields must be filled; optional fields can be left blank.
                      </p>
                    </div>
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                      {etsyPreparationOptions.properties.map((property) => (
                        <div key={property.id} className="min-w-0 space-y-2">
                          <div className="min-h-12">
                            <Label htmlFor={`etsy-property-${property.id}`}>
                              {property.name}{property.required && <span className="ml-1 text-destructive">*</span>}
                            </Label>
                            <p className="mt-1 min-h-4 text-[11px] text-muted-foreground">
                              {etsyPreparationOptions.propertySuggestions[property.name]
                                ? `Suggested from inventory: ${etsyPreparationOptions.propertySuggestions[property.name]}`
                                : "\u00a0"}
                            </p>
                          </div>
                          {property.values.length ? (
                            <Select
                              value={etsyCategoryAttributesByName[property.name] || "__none__"}
                              onValueChange={(value) => setEtsyCategoryAttributesByName((previous) => ({
                                ...previous,
                                [property.name]: value === "__none__" ? "" : value,
                              }))}
                            >
                              <SelectTrigger id={`etsy-property-${property.id}`}><SelectValue placeholder={`Select ${property.name.toLocaleLowerCase()}`} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{property.required ? "Select a value" : "Not specified"}</SelectItem>
                                {property.values.map((value) => <SelectItem key={value.id || value.name} value={value.name}>{value.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`etsy-property-${property.id}`}
                              value={etsyCategoryAttributesByName[property.name] || ""}
                              onChange={(event) => setEtsyCategoryAttributesByName((previous) => ({
                                ...previous,
                                [property.name]: event.target.value,
                              }))}
                              placeholder={`Enter ${property.name.toLocaleLowerCase()}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {etsyMissingRequiredProperties.length > 0 && (
                      <p className="text-xs text-destructive">Required by Etsy: {etsyMissingRequiredProperties.join(", ")}</p>
                    )}
                  </div>
                ) : etsyRequirementsChecked ? (
                  <p className="rounded-md border p-3 text-sm text-muted-foreground">Etsy returned no additional category properties for this category.</p>
                ) : null}
                {etsyRequirementsChecked && (etsyPreparationOptions?.sensitivePropertiesExcluded || 0) > 0 && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                    Etsy returned {etsyPreparationOptions?.sensitivePropertiesExcluded} certificate-related field(s). They are intentionally hidden to protect certificate details; listing publication remains blocked until this category’s privacy conflict is resolved.
                  </p>
                )}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="etsy-listing-title">5. Etsy listing title <span className="text-destructive">*</span></Label>
                    <Input
                      id="etsy-listing-title"
                      value={listingTitle}
                      maxLength={140}
                      onChange={(event) => setListingTitle(event.target.value)}
                      placeholder="Enter Etsy listing title"
                    />
                    <p className="text-xs text-muted-foreground">{listingTitle.length}/140 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etsy-description">Etsy description <span className="text-destructive">*</span></Label>
                    <textarea
                      id="etsy-description"
                      value={etsyListingDetails.description}
                      maxLength={5000}
                      onChange={(event) => setEtsyListingDetails((previous) => ({ ...previous, description: event.target.value }))}
                      placeholder="Write a plain-text Etsy description. Do not include certificate numbers or private certificate notes."
                      className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">{etsyListingDetails.description.length}/5000 characters · HTML descriptions are not used on Etsy.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="etsy-craft-type">Craft type <span className="text-destructive">*</span></Label>
                      <Input
                        id="etsy-craft-type"
                        value={etsyListingDetails.craftType}
                        onChange={(event) => setEtsyListingDetails((previous) => ({ ...previous, craftType: event.target.value }))}
                        placeholder="Enter the Etsy craft type"
                      />
                      <p className="text-xs text-muted-foreground">Use the exact craft type option shown for this category in Etsy.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-when-made">When was it made? <span className="text-destructive">*</span></Label>
                      <Select
                        value={etsyListingDetails.whenMade || "__none__"}
                        onValueChange={(value) => setEtsyListingDetails((previous) => ({ ...previous, whenMade: value === "__none__" ? "" : value }))}
                      >
                        <SelectTrigger id="etsy-when-made"><SelectValue placeholder="Select Etsy date range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select when it was made</SelectItem>
                          <SelectItem value="MADE_TO_ORDER">Made to order</SelectItem>
                          <SelectItem value="2020_2026">2020–2026</SelectItem>
                          <SelectItem value="2010_2019">2010–2019</SelectItem>
                          <SelectItem value="2000_2009">2000–2009</SelectItem>
                          <SelectItem value="1990s">1990s</SelectItem>
                          <SelectItem value="1980s">1980s</SelectItem>
                          <SelectItem value="1970s">1970s</SelectItem>
                          <SelectItem value="1960s">1960s</SelectItem>
                          <SelectItem value="before_1960">Before 1960</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="etsy-who-made">Who made it? <span className="text-destructive">*</span></Label>
                      <Select
                        value={etsyListingDetails.whoMade || "__none__"}
                        onValueChange={(value) => setEtsyListingDetails((previous) => ({
                          ...previous,
                          whoMade: value === "__none__" ? "" : value as EtsyListingDetails["whoMade"],
                        }))}
                      >
                        <SelectTrigger id="etsy-who-made"><SelectValue placeholder="Select who made the item" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select who made it</SelectItem>
                          <SelectItem value="I_DID">I did</SelectItem>
                          <SelectItem value="SHOP_MEMBER">A member of my shop</SelectItem>
                          <SelectItem value="ANOTHER_COMPANY_OR_PERSON">Another company or person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-what-is-it">What is it? <span className="text-destructive">*</span></Label>
                      <Select
                        value={etsyListingDetails.whatIsIt || "__none__"}
                        onValueChange={(value) => setEtsyListingDetails((previous) => ({
                          ...previous,
                          whatIsIt: value === "__none__" ? "" : value as EtsyListingDetails["whatIsIt"],
                        }))}
                      >
                        <SelectTrigger id="etsy-what-is-it"><SelectValue placeholder="Select item type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select item type</SelectItem>
                          <SelectItem value="FINISHED_PRODUCT">A finished product</SelectItem>
                          <SelectItem value="SUPPLY_OR_TOOL">A supply or tool to make things</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="etsy-production-method">How does your shop produce it?</Label>
                      <Select
                        value={etsyListingDetails.productionMethod || "__none__"}
                        onValueChange={(value) => setEtsyListingDetails((previous) => ({
                          ...previous,
                          productionMethod: value === "__none__" ? "" : value as EtsyListingDetails["productionMethod"],
                        }))}
                      >
                        <SelectTrigger id="etsy-production-method"><SelectValue placeholder="Select if applicable" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not provided</SelectItem>
                          <SelectItem value="MADE_FROM_SCRATCH">Made from scratch</SelectItem>
                          <SelectItem value="ASSEMBLED">Assembled from purchased parts</SelectItem>
                          <SelectItem value="ALTERED">An item my shop alters</SelectItem>
                          <SelectItem value="CURATED_SET">A curated set of purchased goods</SelectItem>
                          <SelectItem value="NATURAL_MATERIAL">A natural material</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-quantity">Quantity <span className="text-destructive">*</span></Label>
                      <Input
                        id="etsy-quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={etsyListingDetails.quantity}
                        onChange={(event) => setEtsyListingDetails((previous) => ({ ...previous, quantity: event.target.value }))}
                        placeholder="Enter listing quantity"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tools used (optional)</Label>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {[
                        ["HAND_TOOLS", "Handheld or hand-guided tools"],
                        ["COMPUTERIZED_TOOLS", "Computerized tools or machines"],
                        ["AI_GENERATOR", "An AI generator"],
                        ["NO_TOOLS", "No tools"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 rounded-md border px-3 py-2">
                          <input
                            type="checkbox"
                            checked={etsyListingDetails.toolsUsed.includes(value)}
                            onChange={(event) => setEtsyListingDetails((previous) => ({
                              ...previous,
                              toolsUsed: event.target.checked
                                ? [...previous.toolsUsed, value]
                                : previous.toolsUsed.filter((tool) => tool !== value),
                            }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etsy-tags">Tags (optional, up to 13)</Label>
                    <Input
                      id="etsy-tags"
                      value={etsyListingDetails.tags}
                      onChange={(event) => setEtsyListingDetails((previous) => ({ ...previous, tags: event.target.value }))}
                      placeholder="Enter tags separated by commas"
                    />
                    <p className={`text-xs ${etsyTags.length > 13 ? "text-destructive" : "text-muted-foreground"}`}>{etsyTags.length}/13 tags · each tag may contain up to 30 characters.</p>
                  </div>
                  {etsyListingDetails.productType === "LOOSE_GEMSTONE" && visibleEtsyGemstoneOptionKeys.length > 0 && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Gemstone item options</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          These additional gemstone fields are shown only when they are not already provided above by Etsy&apos;s category-specific attributes.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {visibleEtsyGemstoneOptionKeys.filter((key) => ["gemstone", "caratWeight", "stoneSource", "shape", "drillStyle"].includes(key)).map((key) => {
                          const label = ETSY_GEMSTONE_ATTRIBUTE_LABELS[key];
                          return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`etsy-gem-${key}`}>{label}</Label>
                            <Input
                              id={`etsy-gem-${key}`}
                              value={etsyGemstoneAttributes[key]}
                              onChange={(event) => setEtsyGemstoneAttributes((previous) => ({ ...previous, [key]: event.target.value }))}
                              placeholder={`Enter ${label.toLocaleLowerCase()}`}
                            />
                          </div>
                          );
                        })}
                        {visibleEtsyGemstoneOptionKeys.filter((key) => !["gemstone", "caratWeight", "stoneSource", "shape", "drillStyle"].includes(key)).map((key) => {
                          const label = ETSY_GEMSTONE_ATTRIBUTE_LABELS[key];
                          return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`etsy-gem-${key}`}>{label}</Label>
                            <Select
                              value={etsyGemstoneAttributes[key] || "UNANSWERED"}
                              onValueChange={(value) => setEtsyGemstoneAttributes((previous) => ({
                                ...previous,
                                [key]: value === "UNANSWERED" ? "" : value,
                              }))}
                            >
                              <SelectTrigger id={`etsy-gem-${key}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNANSWERED">Not answered</SelectItem>
                                <SelectItem value="YES">Yes</SelectItem>
                                <SelectItem value="NO">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <MarketplaceMediaSelector
                    marketplace="ETSY"
                    assets={pricing?.mediaAssets || []}
                    selectedUrls={selectedMediaUrls}
                    onToggle={toggleMarketplaceMedia}
                  />
                  <div>
                    <Label>6. Etsy listing prices · enter manually <span className="text-destructive">*</span></Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These are intended prices, not ERP selling-price defaults. Etsy uses the India amount for INR shops, the US amount for USD shops, or the global amount for other shop currencies, converted using the configured exchange rate.
                    </p>
                  </div>
                  <PricingSummary
                    pricing={pricing}
                    loading={pricingLoading}
                    error={pricingError}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="etsy-india-price">India · INR</Label>
                      <Input id="etsy-india-price" type="number" min="0.01" step="0.01" value={etsyPrices.india} onChange={(event) => setEtsyPrices((previous) => ({ ...previous, india: event.target.value }))} placeholder="Price in INR" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-us-price">US · INR</Label>
                      <Input id="etsy-us-price" type="number" min="0.01" step="0.01" value={etsyPrices.us} onChange={(event) => setEtsyPrices((previous) => ({ ...previous, us: event.target.value }))} placeholder="Price in INR" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etsy-global-price">Global · INR</Label>
                      <Input id="etsy-global-price" type="number" min="0.01" step="0.01" value={etsyPrices.global} onChange={(event) => setEtsyPrices((previous) => ({ ...previous, global: event.target.value }))} placeholder="Enter global price" />
                    </div>
                  </div>
                  <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="etsy-offer-percent">Running offer discount (%)</Label>
                        <Input
                          id="etsy-offer-percent"
                          type="number"
                          min="0"
                          max="99.99"
                          step="0.01"
                          value={etsyOfferPercent}
                          onChange={(event) => setEtsyOfferPercent(event.target.value)}
                          placeholder="Enter current discount percentage"
                        />
                      </div>
                      <span className="rounded-full border px-3 py-2 text-xs font-medium">INR estimate · after offer</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        ["India", etsyDiscountedPricesInr.india],
                        ["US", etsyDiscountedPricesInr.us],
                        ["Global", etsyDiscountedPricesInr.global],
                      ] as const).map(([region, discounted]) => (
                        <div key={region} className="rounded-lg border bg-background p-3">
                          <p className="text-xs text-muted-foreground">{region} · discounted price</p>
                          <p className="mt-1 font-semibold">{discounted === null ? "Enter a price" : INR_FORMATTER.format(discounted)}</p>
                          {discounted !== null && pricing?.msp !== null && pricing?.msp !== undefined && (
                            <p className={`mt-1 text-xs ${discounted < pricing.msp ? "text-destructive" : "text-emerald-700"}`}>
                              {discounted < pricing.msp
                                ? `${INR_FORMATTER.format(pricing.msp - discounted)} below MSP`
                                : `${INR_FORMATTER.format(discounted - pricing.msp)} above MSP`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {pricing?.msp != null && (
                      <p className={`text-xs ${etsyBelowMspRegions.length ? "text-destructive" : "text-muted-foreground"}`}>
                        {etsyBelowMspRegions.length
                          ? `Potential loss: discounted ${etsyBelowMspRegions.join(", ")} price${etsyBelowMspRegions.length > 1 ? "s are" : " is"} below the ${INR_FORMATTER.format(pricing.msp)} MSP.`
                          : "Compare each discounted regional price against MSP before saving."}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-lg text-xs text-muted-foreground">
                      Etsy will use the processing, delivery, and returns settings already configured for the selected shop. The ERP keeps these prices and descriptions as a draft only; nothing is published.
                    </p>
                    <Button
                      type="button"
                      onClick={() => void saveEtsyPriceDraft()}
                      disabled={busy || !inventoryId || !shopId || !selectedShop?.writeReady || !etsyDetailsComplete || !hasSelectedMarketplacePhoto || !etsyPrices.india || !etsyPrices.us || !etsyPrices.global}
                    >
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Etsy marketplace draft
                    </Button>
                  </div>
                </div>
                </>
              ) : marketplace === "EBAY" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="listing-template">2. eBay template</Label>
                    <Select value={template || ""} onValueChange={(value: "LOOSE_GEMSTONE" | "JEWELRY") => {
                      setTemplate(value);
                      setPrepared(null);
                      setTaxonomy(null);
                      setCategoryId("");
                      setAspectValues({});
                      setCustomAspectValues({});
                    }}>
                      <SelectTrigger id="listing-template"><SelectValue placeholder="Select eBay template" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOOSE_GEMSTONE">Loose Gemstone</SelectItem>
                        <SelectItem value="JEWELRY">Bracelet</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{template ? EBAY_TEMPLATE_CATEGORY_PATHS[template] : "Select a template to load its mapped eBay category."}</p>
                  </div>

                  {shopId ? (
                    <div className="space-y-2">
                      <Label>3. Eligible inventory item</Label>
                      <InventoryPicker
                        value={inventoryId}
                        marketplaceReadyOnly
                        marketplace="EBAY"
                        shopId={shopId}
                        onSelect={(id, item) => {
                          setInventoryId(id);
                          setSelectedInventory(item ? { ...item, id } : null);
                          setListingTitle(item ? buildMarketplaceTitle(item, "EBAY") : "");
                          setPrice("");
                          setSelectedMediaUrls([]);
                          setPrepared(null);
                          setTaxonomy(null);
                          setCategoryId("");
                          setAspectValues({});
                          setCustomAspectValues({});
                        }}
                      />
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Select an eBay shop first; inventory already listed or saved as a draft for that shop will be excluded.</p>
                  )}

                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">4–5. eBay category requirements</p>
                        <p className="text-xs text-muted-foreground">Read required and optional item aspects and permitted values from eBay Taxonomy before saving a draft.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void validateEbayTaxonomy()}
                        disabled={busy || !inventoryId || !shopId}
                      >
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Check eBay requirements
                      </Button>
                    </div>
                    {taxonomy && (
                      <div className="space-y-4">
                        {!taxonomy.exactCategoryResolved && taxonomy.suggestions.length > 0 && (
                          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                            <Label htmlFor="ebay-category-suggestion">Choose the correct eBay category</Label>
                            <Select value={categoryId || "__none__"} onValueChange={(value) => setCategoryId(value === "__none__" ? "" : value)}>
                              <SelectTrigger id="ebay-category-suggestion"><SelectValue placeholder="Select category suggestion" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Select a category</SelectItem>
                                {taxonomy.suggestions.map((suggestion) => (
                                  <SelectItem key={suggestion.categoryId} value={suggestion.categoryId}>
                                    {suggestion.categoryPath}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">The template category did not exactly match eBay Taxonomy. Select the correct suggestion and check requirements again.</p>
                          </div>
                        )}
                        {taxonomy.exactCategoryResolved && (
                          <>
                            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                              <span className="font-medium">Resolved category:</span> {taxonomy.categoryPath}
                              <span className="ml-2 text-muted-foreground">(ID {taxonomy.categoryId})</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Values found in inventory are suggested below. Any required field without an inventory value must be entered here. Listing price is entered separately and never copied from ERP.
                            </p>
                            {taxonomy.requiredAspects.length === 0 ? (
                              <p className="text-sm text-muted-foreground">eBay returned no non-certificate required fields for this category.</p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {taxonomy.requiredAspects.map((aspect) => (
                                  <EbayAspectField
                                    key={aspect.name}
                                    aspect={{ ...aspect, required: true }}
                                    value={aspectValues[aspect.name] || ""}
                                    savedValue={taxonomy.savedDefaults[aspect.name]}
                                    suggested={taxonomy.erpSuggestions[aspect.name]}
                                    custom={Boolean(customAspectValues[aspect.name])}
                                    onValueChange={(value) => setAspectValues((previous) => ({ ...previous, [aspect.name]: value }))}
                                    onCustomChange={(value) => setCustomAspectValues((previous) => ({ ...previous, [aspect.name]: value }))}
                                  />
                                ))}
                              </div>
                            )}
                            {taxonomy.optionalAspects.length > 0 && (
                              <details className="rounded-lg border p-3">
                                <summary className="cursor-pointer text-sm font-medium">
                                  Optional fields from eBay ({taxonomy.optionalAspects.length})
                                </summary>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  {taxonomy.optionalAspects.map((aspect) => (
                                    <EbayAspectField
                                      key={aspect.name}
                                      aspect={{ ...aspect, required: false }}
                                      value={aspectValues[aspect.name] || ""}
                                      savedValue={taxonomy.savedDefaults[aspect.name]}
                                      suggested={taxonomy.optionalErpSuggestions[aspect.name]}
                                      custom={Boolean(customAspectValues[aspect.name])}
                                      onValueChange={(value) => setAspectValues((previous) => ({ ...previous, [aspect.name]: value }))}
                                      onCustomChange={(value) => setCustomAspectValues((previous) => ({ ...previous, [aspect.name]: value }))}
                                    />
                                  ))}
                                </div>
                              </details>
                            )}
                            {taxonomy.sensitiveAspectsExcluded > 0 && (
                              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                                {taxonomy.sensitiveRequiredAspectsExcluded > 0
                                  ? `eBay requires ${taxonomy.sensitiveRequiredAspectsExcluded} certificate-detail field(s) for this category. Certification authority fields are available with GCI suggested by default; certificate numbers and report identifiers remain private, so publication stays blocked if eBay requires those identifiers.`
                                  : `${taxonomy.sensitiveAspectsExcluded} optional certificate-detail field(s) were excluded. Certification authority fields remain available with GCI suggested by default; certificate numbers and report identifiers stay private.`}
                              </div>
                            )}
                            {!aspectValuesValid && taxonomy.requiredAspects.length > 0 && (
                              <p className="text-xs text-destructive">
                                Complete the required fields. Missing: {missingRequiredAspects.map((aspect) => aspect.name).join(", ") || "choose a permitted value"}.
                              </p>
                            )}
                          </>
                        )}
                        <p className="text-xs text-muted-foreground">{taxonomy.publishBlockedReason} Taxonomy lookup alone is not a final listing validation.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ebay-listing-title">5. eBay listing title</Label>
                    <Input
                      id="ebay-listing-title"
                      value={listingTitle}
                      maxLength={80}
                      onChange={(event) => {
                        setListingTitle(event.target.value);
                        setPrepared((previous) => previous ? { ...previous, title: event.target.value } : previous);
                      }}
                      placeholder="Enter eBay listing title"
                    />
                    <p className="text-xs text-muted-foreground">{listingTitle.length}/80 characters · editable independently from the inventory name</p>
                  </div>
                  <MarketplaceMediaSelector
                    marketplace="EBAY"
                    assets={pricing?.mediaAssets || []}
                    selectedUrls={selectedMediaUrls}
                    onToggle={toggleMarketplaceMedia}
                  />

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="marketplace-price">6. eBay price (USD)</Label>
                      <Input
                        id="marketplace-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        value={price}
                        onChange={(event) => {
                          setPrice(event.target.value);
                          setPrepared(null);
                        }}
                        placeholder="Enter price in USD"
                      />
                      <p className="text-xs text-muted-foreground">No ERP price is copied into this field.</p>
                    </div>
                    <div className="grid gap-2 sm:max-w-xl sm:grid-cols-2">
                      <Button type="button" variant="outline" className="min-h-10 h-auto w-full whitespace-normal px-3 py-2 text-center leading-tight" onClick={() => void prepare()} disabled={busy || !inventoryId || !shopId}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Prepare ERP preview
                      </Button>
                      <Button type="button" className="min-h-10 h-auto w-full whitespace-normal px-3 py-2 text-center leading-tight" onClick={() => void saveDraft()} disabled={busy || !inventoryId || !shopId || !selectedShop?.writeReady || !listingTitle.trim() || !hasSelectedMarketplacePhoto || !price || !usdToInr || Number(offerPercent) >= 100 || !aspectValuesValid}>
                        Create eBay marketplace draft
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <PricingSummary
                      pricing={pricing}
                      loading={pricingLoading}
                      error={pricingError}
                    />
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">USD conversion & offer impact</p>
                          <p className="text-xs text-muted-foreground">Compare the discounted INR estimate with the Opportunity Report MSP.</p>
                        </div>
                        <span className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">Estimate</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="usd-to-inr">Conversion rate · INR per USD</Label>
                          <Input id="usd-to-inr" type="number" min="0.01" step="0.01" inputMode="decimal" value={usdToInr} onChange={(event) => setUsdToInr(event.target.value)} placeholder="Enter INR per USD" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ebay-offer-percent">Running offer · %</Label>
                          <Input id="ebay-offer-percent" type="number" min="0" max="99.99" step="0.01" inputMode="decimal" value={offerPercent} onChange={(event) => setOfferPercent(event.target.value)} />
                        </div>
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Discounted sale price in INR</p>
                          <p className="mt-1 text-lg font-semibold">
                            {discountedPriceInr === null ? "—" : INR_FORMATTER.format(discountedPriceInr)}
                          </p>
                        </div>
                      </div>
                      {price && Number(usdToInr) > 0 && (
                        <div className="mt-3 grid gap-2 rounded-lg bg-background p-3 text-sm sm:grid-cols-2">
                          <p className="text-muted-foreground">
                            Before offer: {INR_FORMATTER.format(Number(price) * Number(usdToInr))}
                          </p>
                          <p className="text-muted-foreground">
                            After {Number(offerPercent) || 0}% offer: {discountedPriceInr === null ? "Enter a valid offer below 100%" : INR_FORMATTER.format(discountedPriceInr)}
                          </p>
                        </div>
                      )}
                      {belowMsp !== null && (
                        <div className={`mt-3 rounded-lg border p-3 text-sm ${belowMsp ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-emerald-600/30 bg-emerald-600/5 text-emerald-700"}`}>
                          {belowMsp
                            ? `Potential loss: the discounted sale price is ${INR_FORMATTER.format(pricing!.msp! - discountedPriceInr!)} below MSP.`
                            : `Above MSP by ${INR_FORMATTER.format(discountedPriceInr! - pricing!.msp!)} after the entered offer.`}
                        </div>
                      )}
                      {pricing?.warning && (
                        <p className="mt-3 text-xs text-amber-700">{pricing.warning}</p>
                      )}
                      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                        Planning estimate only. It uses the saved currency rate and the Opportunity Report default profile so the MSP matches that report. Actual marketplace fees, live FX, shipping, taxes, and sale terms may differ.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="font-medium">Choose a marketplace to begin</p>
                  <p className="mt-1 text-sm text-muted-foreground">The shop, template, inventory, and pricing steps will appear after you make an explicit selection.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>Preparation review</CardTitle>
            <CardDescription>Review ERP data before saving an unpublished draft to the selected marketplace shop.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedInventory && (
              <div className="overflow-hidden rounded-xl border">
                <div className="relative aspect-16/10 bg-muted">
                  {selectedInventory.imageUrl
                    ? <Image src={selectedInventory.imageUrl} alt={`${selectedInventory.itemName} inventory photo`} fill unoptimized className="object-contain p-2" />
                    : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground" /></div>}
                </div>
                <div className="space-y-1 p-4">
                  <p className="font-semibold">{selectedInventory.itemName}</p>
                  <p className="text-xs text-muted-foreground">{selectedInventory.sku} · {[selectedInventory.category, selectedInventory.gemType, selectedInventory.color].filter(Boolean).join(" · ")}</p>
                  <div className="flex flex-wrap gap-2 pt-2 text-xs">
                    <span className="rounded-full border px-2.5 py-1">ERP MRP {INR_FORMATTER.format(pricing?.mrp ?? selectedInventory.sellingPrice ?? 0)}</span>
                    <span className="rounded-full border px-2.5 py-1">
                      {pricing?.msp == null ? "MSP unavailable" : `Marketplace MSP ${INR_FORMATTER.format(pricing.msp)}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!prepared ? (
              marketplace === "ETSY" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {etsyPendingChecks.length
                        ? <CircleAlert className="h-4 w-4 text-amber-600" />
                        : <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                      {etsyPendingChecks.length
                        ? `${etsyPendingChecks.length} Etsy check${etsyPendingChecks.length === 1 ? "" : "s"} pending`
                        : "Etsy preparation checks complete"}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {etsyReviewChecks.map((check) => (
                        <li key={check.label} className="flex items-start gap-2 text-sm">
                          {check.complete
                            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                          <span className={check.complete ? "text-muted-foreground" : "font-medium"}>{check.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {etsyBelowMspRegions.length > 0 && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      Discounted {etsyBelowMspRegions.join(", ")} price is below the marketplace MSP.
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Saving creates an unpublished Etsy draft. Add any missing media or details and publish it from Etsy.</p>
                  {pricingLoading && <p className="text-xs text-muted-foreground">Loading MSP/MRP guidance…</p>}
                  {pricingError && <p role="alert" className="text-xs text-destructive">{pricingError}</p>}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <p className="text-sm font-medium">{selectedInventory ? "Inventory selected" : "No listing prepared"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Select an eligible item and connected shop, then evaluate its listing data.</p>
                  {pricingLoading && <p className="mt-2 text-xs text-muted-foreground">Loading MSP/MRP guidance…</p>}
                  {pricingError && <p role="alert" className="mt-2 text-xs text-destructive">{pricingError}</p>}
                </div>
              )
            ) : (
              <>
                <div>
                  <p className="font-semibold">{prepared.inventory.itemName}</p>
                  <p className="text-sm text-muted-foreground">{prepared.inventory.sku} · {prepared.inventory.category}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {preparedReviewActions.length} user action{preparedReviewActions.length === 1 ? "" : "s"} remaining
                  </div>
                  {preparedReviewActions.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {preparedReviewActions.map((entry) => <li key={entry} className="flex items-center gap-2"><CircleAlert className="h-3.5 w-3.5 text-amber-600" />{entry}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Available ERP inputs are ready for review.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Condition: {prepared.condition || "Needs review"}</p>
                {prepared.existing && (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
                    An existing eBay listing was found for this item and shop ({prepared.existing.status}). The ERP draft is blocked to avoid creating a duplicate.
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-md border p-3">
                  {prepared.inventory.imageUrl
                    ? <Image src={prepared.inventory.imageUrl} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded object-cover" />
                    : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Primary image ready</p>
                    <p className="text-xs text-muted-foreground">Selected automatically from inventory.</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Generated eBay description</p>
                  <p className="text-xs font-medium">{prepared.title}</p>
                  <div className="max-h-72 overflow-auto rounded-md border bg-white p-3 text-xs text-slate-900">
                    <iframe
                      title="eBay description preview"
                      srcDoc={prepared.description}
                      sandbox=""
                      className="h-64 w-full border-0"
                    />
                  </div>
                </div>
                {!prepared.publishAvailable && (
                  <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{prepared.publishBlockedReason}</p>
                )}
                <p className="text-xs text-muted-foreground">{prepared.format} · {prepared.duration}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PricingSummary({
  pricing,
  loading,
  error,
}: {
  pricing: PricingGuidance | null;
  loading: boolean;
  error: string;
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Calculating MSP/MRP using saved marketplace pricing rules…</p>;
  }
  if (error) {
    return <p role="alert" className="text-xs text-destructive">{error}</p>;
  }
  if (!pricing) {
    return <p className="text-xs text-muted-foreground">Select inventory to load MSP/MRP guidance.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">MSP · minimum selling price</p>
        <p className="mt-1 text-lg font-semibold">
          {pricing.msp === null ? "Not available" : INR_FORMATTER.format(pricing.msp)}
        </p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">MRP · ERP selling price</p>
        <p className="mt-1 text-lg font-semibold">{INR_FORMATTER.format(pricing.mrp)}</p>
      </div>
      {pricing.profileName && (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          MSP basis: {pricing.profileName}
          {pricing.profileSource === "DEFAULT_OPPORTUNITY_PROFILE" ? " (same default profile used by Opportunity Report)" : " (marketplace profile fallback)"}
        </p>
      )}
      {pricing.msp !== null && (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Cost basis {INR_FORMATTER.format(pricing.purchasePrice)} + profile charges {INR_FORMATTER.format(pricing.marketplaceFees || 0)} = MSP {INR_FORMATTER.format(pricing.msp)}.
        </p>
      )}
      {pricing.warning && <p className="text-xs text-amber-700 sm:col-span-2">{pricing.warning}</p>}
    </div>
  );
}

function MarketplaceMediaSelector({
  marketplace,
  assets,
  selectedUrls,
  onToggle,
}: {
  marketplace: "EBAY" | "ETSY";
  assets: Array<{ id: string; mediaUrl: string; type: "IMAGE" | "VIDEO" }>;
  selectedUrls: string[];
  onToggle: (url: string) => void;
}) {
  const maxImages = marketplace === "EBAY" ? 24 : 20;
  const maxVideos = marketplace === "EBAY" ? 1 : 2;
  const selectedImages = assets.filter((asset) => asset.type === "IMAGE" && selectedUrls.includes(asset.mediaUrl)).length;
  const selectedVideos = assets.filter((asset) => asset.type === "VIDEO" && selectedUrls.includes(asset.mediaUrl)).length;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Listing photos and videos</p>
          <p className="text-xs text-muted-foreground">Select files already attached to this ERP inventory item. Additional files can be uploaded from the inventory media editor.</p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs">
          {selectedImages}/{maxImages} photos · {selectedVideos}/{maxVideos} videos
        </span>
      </div>
      {assets.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const isSelected = selectedUrls.includes(asset.mediaUrl);
            return (
              <button
                type="button"
                key={asset.id}
                aria-pressed={isSelected}
                onClick={() => onToggle(asset.mediaUrl)}
                className={`overflow-hidden rounded-lg border text-left transition-colors ${isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}`}
              >
                <div className="relative aspect-square bg-muted">
                  {asset.type === "IMAGE" ? (
                    <Image src={asset.mediaUrl} alt="Inventory product media" fill sizes="180px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Video className="h-8 w-8" />
                      <span className="text-xs">Video attached</span>
                    </div>
                  )}
                  <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSelected ? "bg-primary text-primary-foreground" : "bg-background/90"}`}>
                    {isSelected ? "Included" : "Add"}
                  </span>
                </div>
                <span className="block px-2 py-1.5 text-xs text-muted-foreground">{asset.type === "IMAGE" ? "Photo" : "Video"}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No photo or video media is attached to the selected inventory item.</p>
      )}
      {marketplace === "ETSY" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Etsy allows JPG, GIF, or PNG photos and up to 2 videos. Selected media is uploaded to the unpublished Etsy draft; add any missing media or details in Etsy before publishing.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">eBay allows up to 24 photos and one product video. Selected media is attached to the unpublished offer; add anything missing in Seller Hub before publishing.</p>
      )}
    </div>
  );
}
