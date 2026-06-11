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
  pricingMode: z.enum(["PER_CARAT", "PER_RATTI", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  purchaseRatePerRatti: z.coerce.number().optional(),
  sellingRatePerRatti: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  certificateComments: z.string().optional(),
  status: z.enum(["IN_STOCK", "SOLD", "RESERVED", "MEMO"]).optional().default("IN_STOCK"),
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
  _priceRecommendation: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.pricingMode === "PER_CARAT") {
    if (!values.purchaseRatePerCarat || values.purchaseRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchaseRatePerCarat"], message: "Purchase rate per carat is required" });
    }
    if (!values.sellingRatePerCarat || values.sellingRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sellingRatePerCarat"], message: "Selling rate per carat is required" });
    }
  } else if (values.pricingMode === "PER_RATTI") {
    if (!values.purchaseRatePerRatti || values.purchaseRatePerRatti <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchaseRatePerRatti"], message: "Purchase rate per ratti is required" });
    }
    if (!values.sellingRatePerRatti || values.sellingRatePerRatti <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sellingRatePerRatti"], message: "Selling rate per ratti is required" });
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
  sku?: string | undefined;
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
  pricingMode: "PER_CARAT" | "PER_RATTI" | "FLAT";
  purchaseRatePerCarat?: number | undefined;
  sellingRatePerCarat?: number | undefined;
  purchaseRatePerRatti?: number | undefined;
  sellingRatePerRatti?: number | undefined;
  flatPurchaseCost?: number | undefined;
  flatSellingPrice?: number | undefined;
  notes?: string | undefined;
  description?: string | undefined;
  certificateComments?: string | undefined;
  status?: "IN_STOCK" | "SOLD" | "RESERVED" | "MEMO" | undefined;
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
  _priceRecommendation?: string | undefined;
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
  origins?: string[];
  initialData?: InventoryWithExtras & { media: InventoryMedia[]; rashiCodes?: { id: string }[] };
}

export const ORIGIN_PRESETS = ["Burma (Myanmar)", "Sri Lanka (Ceylon)", "Kashmir", "Madagascar", "Mozambique", "Thailand", "Colombia", "Zambia"];
export const FLUORESCENCE_PRESETS = ["None", "Faint", "Medium", "Strong", "Very Strong", "Not Applicable"];
export const TREATMENT_PRESETS = ["None", "Untreated", "Heat", "Oil", "Resin", "Irradiation", "Diffusion", "Glass-Filled"];

export function generateFallbackDescription(values: FormInputValues, sku?: string) {
  const {
    itemName,
    category,
    gemType,
    color,
    shape,
    dimensionsMm,
    weightValue,
    weightUnit,
    weightRatti,
    treatment,
    origin,
    fluorescence,
    certification,
    transparency,
    stockLocation,
    notes,
    certificateComments,
    braceletType,
    beadSizeMm,
    beadCount,
    holeSizeMm,
    innerCircumferenceMm,
    standardSize,
    mediaUrls,
  } = values;

  const name = itemName || "Gemstone";
  const weightStr = weightValue ? `${weightValue} ${weightUnit || "cts"}` : "";
  const title = [name, weightStr].filter(Boolean).join(" — ");

  const overviewParts: string[] = [
    `Presenting ${name},`,
  ];
  if (gemType) {
    overviewParts.push(`a premium ${gemType.toLowerCase()}`);
  } else {
    overviewParts.push("a premium natural gemstone");
  }
  if (origin) overviewParts.push(`from ${origin}`);
  if (color) overviewParts.push(`featuring a captivating ${color.toLowerCase()} hue`);
  if (weightValue) overviewParts.push(`weighing ${weightStr}`);
  overviewParts.push(
    ". This meticulously selected specimen is now available through Khyati Precious Gems Private Limited, offering exceptional quality and value for discerning buyers, collectors, and jewelry designers."
  );

  const detailParts: string[] = [];
  if (transparency && transparency.toLowerCase() !== "none") {
    detailParts.push(`The stone exhibits ${transparency.toLowerCase()} transparency`);
    if (fluorescence && fluorescence.toLowerCase() !== "none") {
      detailParts.push(`with ${fluorescence.toLowerCase()} fluorescence`);
    }
    detailParts.push(".");
  } else if (fluorescence && fluorescence.toLowerCase() !== "none") {
    detailParts.push(`The stone exhibits ${fluorescence.toLowerCase()} fluorescence.`);
  }
  if (treatment && treatment.toLowerCase() !== "none" && treatment.toLowerCase() !== "untreated") {
    detailParts.push(` It has undergone ${treatment.toLowerCase()} treatment to enhance its natural beauty.`);
  } else if (treatment && treatment.toLowerCase() === "untreated") {
    detailParts.push(" This gemstone is completely untreated, ensuring its fully natural state.");
  } else {
    detailParts.push(" This gemstone is in its natural state, free from any enhancements.");
  }
  if (certification && certification.toLowerCase() !== "none") {
    detailParts.push(` It is accompanied by a ${certification} certification, guaranteeing authenticity and quality.`);
  }
  if (dimensionsMm) {
    detailParts.push(` The dimensions measure ${dimensionsMm}.`);
  }
  if (shape) {
    detailParts.push(` Cut in a ${shape.toLowerCase()} shape, the gemstone displays excellent brilliance and proportion.`);
  }

  const specificParts: string[] = [];
  if (braceletType) specificParts.push(`Bracelet Type: ${braceletType}`);
  if (beadSizeMm) specificParts.push(`Bead Size: ${beadSizeMm}mm`);
  if (beadCount) specificParts.push(`Bead Count: ${beadCount}`);
  if (holeSizeMm) specificParts.push(`Hole Size: ${holeSizeMm}mm`);
  if (innerCircumferenceMm) specificParts.push(`Inner Circumference: ${innerCircumferenceMm}mm`);
  if (standardSize) specificParts.push(`Standard Size: ${standardSize}`);

  const specs: string[] = [];
  if (category) specs.push(`Category: ${category}`);
  if (gemType) specs.push(`Gem Type: ${gemType}`);
  if (color) specs.push(`Color: ${color}`);
  if (shape) specs.push(`Shape: ${shape}`);
  if (weightValue) specs.push(`Weight: ${weightValue} ${weightUnit || "cts"}`);
  if (weightRatti) specs.push(`Ratti Weight: ${weightRatti} ratti`);
  if (dimensionsMm) specs.push(`Dimensions: ${dimensionsMm}`);
  if (origin) specs.push(`Origin: ${origin}`);
  if (treatment && treatment.toLowerCase() !== "none") specs.push(`Treatment: ${treatment}`);
  if (fluorescence && fluorescence.toLowerCase() !== "none") specs.push(`Fluorescence: ${fluorescence}`);
  if (transparency && transparency.toLowerCase() !== "none") specs.push(`Transparency: ${transparency}`);
  if (certification && certification.toLowerCase() !== "none") specs.push(`Certification: ${certification}`);
  if (stockLocation) specs.push(`Stock Location: ${stockLocation}`);
  const lines: string[] = [title, ""];
  lines.push(overviewParts.join(" "));
  lines.push("");
  lines.push(detailParts.join(""));
  lines.push("");

  if (specificParts.length > 0) {
    lines.push("Specific Details:");
    specificParts.forEach((s) => lines.push(s));
    lines.push("");
  }

  if (specs.length > 0) {
    lines.push("Key Specifications:");
    specs.forEach((s) => lines.push(`  ${s}`));
    lines.push("");
  }

  if (notes) {
    lines.push(`Notes: ${notes}`);
    lines.push("");
  }

  if (certificateComments) {
    lines.push(`Certificate Comments: ${certificateComments}`);
    lines.push("");
  }

  if (sku) {
    lines.push(`SKU: ${sku}`);
    lines.push("");
  }

  if (mediaUrls && mediaUrls.length > 0) {
    lines.push("Product Images:");
    mediaUrls.forEach((url) => {
      if (url) lines.push(url);
    });
    lines.push("");
  }

  lines.push("Offered exclusively by Khyati Precious Gems Private Limited.");
  lines.push("For inquiries, pricing, or additional details, please contact our sales team.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
