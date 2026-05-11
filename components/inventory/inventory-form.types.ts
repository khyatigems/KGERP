"use client";

import * as z from "zod";
import type { Inventory, InventoryMedia } from "@prisma/client";

export type CodeRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  remarks?: string | null;
};

export type InventoryWithExtras = Inventory & {
  category?: string | null;
  weightRatti?: number | null;
  color?: string | null;
  categoryCodeId?: string | null;
  gemstoneCodeId?: string | null;
  colorCodeId?: string | null;
  cutCodeId?: string | null;
  braceletType?: string | null;
  beadSizeMm?: number | null;
  beadSizeLabel?: string | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  standardSize?: string | null;
  categoryCode?: { name: string } | null;
  gemstoneCode?: { name: string } | null;
  colorCode?: { name: string } | null;
  cutCode?: { name: string } | null;
  collectionCode?: { name: string } | null;
  certificates?: { id: string }[];
};

export const formSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().optional(),
  color: z.string().optional(),
  shape: z.string().optional(),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().min(0, "Weight must be non-negative"),
  weightUnit: z.string().default("cts"),
  weightRatti: z.coerce.number().optional(),
  treatment: z.string().optional(),
  origin: z.string().optional(),
  fluorescence: z.string().optional(),
  certification: z.string().optional(),
  certificateCodeIds: z.array(z.string()).optional(),
  transparency: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  certificateComments: z.string().optional(),
  stockLocation: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  categoryCodeId: z.string().optional(),
  gemstoneCodeId: z.string().optional(),
  colorCodeId: z.string().optional(),
  collectionCodeId: z.string().optional(),
  rashiCodeIds: z.array(z.string()).optional(),
  cutCodeId: z.string().optional(),
  braceletType: z.string().optional(),
  beadSizeMm: z.preprocess((val) => (val === "" ? undefined : typeof val === "string" ? Number(val) || undefined : val), z.number().optional()),
  beadCount: z.preprocess((val) => (val === "" ? undefined : typeof val === "string" ? Number(val) || undefined : val), z.number().int().optional()),
  holeSizeMm: z.preprocess((val) => (val === "" ? undefined : typeof val === "string" ? Number(val) || undefined : val), z.number().optional()),
  innerCircumferenceMm: z.preprocess((val) => (val === "" ? undefined : typeof val === "string" ? Number(val) || undefined : val), z.number().optional()),
  standardSize: z.string().optional(),
  beadSize: z.string().max(32).optional().transform(v => (v || "").trim() || undefined),
  braceletSize: z.string().optional(),
  holeSize: z.string().optional(),
  ringSize: z.string().optional(),
  ringAdjustable: z.string().optional(),
  pendantLoop: z.string().optional(),
  figureHeight: z.string().optional(),
  figureWidth: z.string().optional(),
  chipSize: z.string().optional(),
  packingType: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.pricingMode === "PER_CARAT") {
    if (!values.purchaseRatePerCarat || values.purchaseRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchaseRatePerCarat"], message: "Purchase rate per carat is required" });
    }
    if (!values.sellingRatePerCarat || values.sellingRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sellingRatePerCarat"], message: "Selling rate per carat is required" });
    }
  } else {
    // For FLAT pricing, ensure values are >= 0 (0 is allowed as a valid price)
    if (values.flatPurchaseCost === undefined || values.flatPurchaseCost === null || values.flatPurchaseCost < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["flatPurchaseCost"], message: "Flat purchase cost is required" });
    }
    if (values.flatSellingPrice === undefined || values.flatSellingPrice === null || values.flatSellingPrice < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["flatSellingPrice"], message: "Flat selling price is required" });
    }
  }
});

export type FormInputValues = {
  itemName: string;
  internalName?: string | undefined;
  category: string;
  gemType?: string | undefined;
  color?: string | undefined;
  shape?: string | undefined;
  dimensionsMm?: string | undefined;
  weightValue: number;
  weightUnit: string;
  weightRatti?: number | undefined;
  treatment?: string | undefined;
  origin?: string | undefined;
  fluorescence?: string | undefined;
  certification?: string | undefined;
  certificateCodeIds?: string[] | undefined;
  transparency?: string | undefined;
  vendorId: string;
  pricingMode: "PER_CARAT" | "FLAT";
  purchaseRatePerCarat?: number | undefined;
  sellingRatePerCarat?: number | undefined;
  flatPurchaseCost?: number | undefined;
  flatSellingPrice?: number | undefined;
  notes?: string | undefined;
  certificateComments?: string | undefined;
  stockLocation?: string | undefined;
  mediaUrl?: string | undefined;
  mediaUrls?: string[] | undefined;
  categoryCodeId?: string | undefined;
  gemstoneCodeId?: string | undefined;
  colorCodeId?: string | undefined;
  collectionCodeId?: string | undefined;
  rashiCodeIds?: string[] | undefined;
  cutCodeId?: string | undefined;
  braceletType?: string | undefined;
  beadSizeMm?: number | "" | undefined;
  beadCount?: number | "" | undefined;
  holeSizeMm?: number | "" | undefined;
  innerCircumferenceMm?: number | "" | undefined;
  standardSize?: string | undefined;
  beadSize: string | undefined;
  braceletSize?: string | undefined;
  holeSize?: string | undefined;
  ringSize?: string | undefined;
  ringAdjustable?: string | undefined;
  pendantLoop?: string | undefined;
  figureHeight?: string | undefined;
  figureWidth?: string | undefined;
  chipSize?: string | undefined;
  packingType?: string | undefined;
};

export type FormValues = z.infer<typeof formSchema>;

export interface InventoryFormProps {
  vendors: { id: string; name: string }[];
  categories: CodeRow[];
  gemstones: CodeRow[];
  colors: CodeRow[];
  collections: CodeRow[];
  rashis: CodeRow[];
  cuts: CodeRow[];
  certificates?: CodeRow[];
  initialData?: InventoryWithExtras & { media: InventoryMedia[]; rashiCodes?: { id: string }[] };
}

export const ORIGIN_PRESETS = ["Burma (Myanmar)", "Sri Lanka (Ceylon)", "Kashmir", "Madagascar", "Mozambique", "Thailand", "Colombia", "Zambia"];
export const FLUORESCENCE_PRESETS = ["None", "Faint", "Medium", "Strong", "Very Strong"];
export const TREATMENT_PRESETS = ["None", "Untreated", "Heat", "Oil", "Resin", "Irradiation", "Diffusion", "Glass-Filled"];

export function generateFallbackDescription(values: FormValues) {
  const {
    itemName,
    weightValue,
    weightUnit,
    gemType,
    color,
    shape,
    transparency,
    treatment,
    certification,
    dimensionsMm,
  } = values;

  const weightStr = `${weightValue} ${weightUnit === "cts" ? "Carats" : weightUnit}`;
  const title = `${itemName} \u2013 ${weightStr} \uD83D\uDC8E`;

  return `
${title}

Description:
This exquisite ${gemType || itemName} weighs an impressive ${weightValue} carats and showcases a deep, rich ${color || "hue"} with excellent brilliance. Expertly cut to enhance light performance, this gemstone reflects timeless elegance and enduring value.

${gemType || "This gemstone"} has long been associated with wisdom, prosperity, and royalty. Its bold presence and superior clarity make it an ideal choice for bespoke high-end jewelry or as a serious addition to a gemstone investment portfolio.

${certification ? `Independently lab certified (${certification}), this gemstone guarantees authenticity and quality\u2014ensuring complete peace of mind for discerning buyers.` : "Guaranteed for authenticity and quality\u2014ensuring complete peace of mind for discerning buyers."}

Key Specifications:

Gem Type: ${gemType || "Natural Gemstone"}
Shape: ${shape || "As per selection"}
Weight: ${weightStr}
Dimensions: ${dimensionsMm || "As per entered value"}
Color: ${color || "As per selection"}
Transparency: ${transparency || "As per selection"}
Treatment: ${treatment || "As per entered value"}
Certification: ${certification || "As per entered value"}

Closing Note:
A statement gemstone with undeniable presence\u2014this ${weightStr} ${gemType || itemName} is crafted for collectors, investors, and luxury jewelry connoisseurs who value authenticity and impact. Exclusively offered by Khyati Precious Gems Private Limited.
`.trim();
}
