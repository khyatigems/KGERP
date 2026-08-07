export type FieldSeverity = "core" | "recommended";

export interface ImportantFieldDef {
  key: string;
  label: string;
  severity: FieldSeverity;
  test: (values: CompletenessValues) => { ok: boolean; message?: string };
}

export interface CompletenessValues {
  itemName?: string;
  category?: string;
  vendorId?: string;
  weightValue?: number | string;
  weightUnit?: string;
  pricingMode?: string;
  purchaseRatePerCarat?: number | string;
  sellingRatePerCarat?: number | string;
  purchaseRatePerRatti?: number | string;
  sellingRatePerRatti?: number | string;
  flatPurchaseCost?: number | string;
  flatSellingPrice?: number | string;
  mediaUrls?: string[];
  mediaUrl?: string;
  gemType?: string;
  color?: string;
  shape?: string;
  dimensionsMm?: string;
  certificateCodeIds?: string[];
  certification?: string;
  stockLocation?: string;
  hsnCode?: string;
  cutCodeId?: string;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : (v as number | undefined);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export const IMPORTANT_FIELDS: ImportantFieldDef[] = [
  {
    key: "itemName",
    label: "Item Name",
    severity: "core",
    test: (v) => ({ ok: hasText(v.itemName), message: "Required for a sellable record" }),
  },
  {
    key: "category",
    label: "Category",
    severity: "core",
    test: (v) => ({ ok: hasText(v.category), message: "Select a category" }),
  },
  {
    key: "vendorId",
    label: "Vendor",
    severity: "core",
    test: (v) => ({ ok: hasText(v.vendorId), message: "Select a vendor" }),
  },
  {
    key: "weightValue",
    label: "Weight",
    severity: "core",
    test: (v) => {
      const w = num(v.weightValue);
      return { ok: w > 0, message: "Weight must be greater than 0" };
    },
  },
  {
    key: "pricing",
    label: "Pricing (per mode)",
    severity: "core",
    test: (v) => {
      const mode = v.pricingMode;
      if (mode === "PER_CARAT") {
        const ok = num(v.purchaseRatePerCarat) > 0 && num(v.sellingRatePerCarat) > 0;
        return { ok, message: ok ? undefined : "Enter purchase & selling rate per carat" };
      }
      if (mode === "PER_RATTI") {
        const ok = num(v.purchaseRatePerRatti) > 0 && num(v.sellingRatePerRatti) > 0;
        return { ok, message: ok ? undefined : "Enter purchase & selling rate per ratti" };
      }
      const ok = num(v.flatPurchaseCost) > 0 && num(v.flatSellingPrice) > 0;
      return { ok, message: ok ? undefined : "Enter total cost & selling price" };
    },
  },
  {
    key: "images",
    label: "Product Image(s)",
    severity: "recommended",
    test: (v) => {
      const has = (v.mediaUrls?.length ?? 0) > 0 || hasText(v.mediaUrl);
      return { ok: has, message: "Add at least one image for the marketplace listing" };
    },
  },
  {
    key: "gemType",
    label: "Gem Type",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.gemType), message: "Improves listing discovery" }),
  },
  {
    key: "color",
    label: "Color",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.color), message: "Shown on the marketplace listing" }),
  },
  {
    key: "shape",
    label: "Shape",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.shape), message: "Shown on the marketplace listing" }),
  },
  {
    key: "cut",
    label: "Cut",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.cutCodeId), message: "Add a cut for loose stones" }),
  },
  {
    key: "dimensionsMm",
    label: "Dimensions (mm)",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.dimensionsMm), message: "Buyers expect dimensions" }),
  },
  {
    key: "hsnCode",
    label: "HSN Code",
    severity: "recommended",
    test: (v) => ({ ok: hasText(v.hsnCode), message: "Required for invoicing/exports" }),
  },
];

export interface ImportantFieldStatus {
  key: string;
  label: string;
  severity: FieldSeverity;
  ok: boolean;
  message?: string;
}

export interface CompletenessResult {
  score: number;
  total: number;
  passed: number;
  coreMissing: string[];
  recommendedMissing: string[];
  fields: ImportantFieldStatus[];
}

export function getInventoryCompleteness(values: CompletenessValues): CompletenessResult {
  const fields = IMPORTANT_FIELDS.map((f) => {
    const { ok, message } = f.test(values);
    return { key: f.key, label: f.label, severity: f.severity, ok, message };
  });

  const coreMissing = fields.filter((f) => f.severity === "core" && !f.ok).map((f) => f.label);
  const recommendedMissing = fields.filter((f) => f.severity === "recommended" && !f.ok).map((f) => f.label);
  const passed = fields.filter((f) => f.ok).length;
  const total = fields.length;

  return {
    score: total === 0 ? 100 : Math.round((passed / total) * 100),
    total,
    passed,
    coreMissing,
    recommendedMissing,
    fields,
  };
}
