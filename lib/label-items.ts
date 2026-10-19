import type { LabelItem } from "@/lib/label-generator";
import { encodePrice } from "@/lib/price-encoder";

/** Inventory fields used by both the preview and the persisted print job. */
export interface LabelInventorySource {
    id: string;
    sku: string;
    itemName: string;
    internalName?: string | null;
    gemType?: string | null;
    colorCode?: { name: string } | null;
    weightValue?: number | null;
    weightUnit?: string | null;
    weightRatti?: number | null;
    shape?: string | null;
    dimensionsMm?: string | null;
    stockLocation?: string | null;
    pricingMode?: string | null;
    flatSellingPrice?: number | null;
    sellingRatePerCarat?: number | null;
}

export interface LabelJobSource {
    sellingPrice: number;
    priceWithChecksum?: string | null;
    checksumDigit?: number | null;
    internalName?: string | null;
}

export type PreparedLabelItem = LabelItem & {
    inventoryId: string;
    checksumDigit: number;
    priceWithChecksum: string;
};

export function getLabelSellingPrice(item: LabelInventorySource): number {
    const perCaratTotal = (item.sellingRatePerCarat ?? 0) * (item.weightValue ?? 0);
    return item.pricingMode === "PER_CARAT"
        ? perCaratTotal
        : item.flatSellingPrice ?? perCaratTotal;
}

/** Stored job prices take priority for a reprint; descriptions use current inventory. */
export function toLabelItem(item: LabelInventorySource, stored?: LabelJobSource): PreparedLabelItem {
    const sellingPrice = stored?.sellingPrice ?? getLabelSellingPrice(item);
    const encoded = encodePrice(sellingPrice);
    return {
        id: item.id,
        inventoryId: item.id,
        sku: item.sku,
        itemName: item.itemName,
        internalName: stored?.internalName?.trim() || item.internalName?.trim() || "",
        gemType: item.gemType ?? "",
        color: item.colorCode?.name ?? "",
        weightValue: item.weightValue ?? 0,
        weightUnit: item.weightUnit ?? "",
        weightRatti: item.weightRatti,
        shape: item.shape,
        dimensions: item.dimensionsMm,
        stockLocation: item.stockLocation,
        sellingPrice,
        pricingMode: stored ? "REPRINT" : item.pricingMode === "PER_CARAT" ? "PER_CARAT" : "FLAT",
        sellingRatePerCarat: stored ? null : item.sellingRatePerCarat,
        priceWithChecksum: stored?.priceWithChecksum ?? encoded.priceWithChecksum,
        checksumDigit: stored?.checksumDigit ?? encoded.checksumDigit,
    };
}
