
import { z } from "zod";

const inventorySchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().optional(),
  color: z.string().optional(),
  categoryCodeId: z.string().optional().transform(v => v === "" ? undefined : v).pipe(z.string().uuid().optional()),
  gemstoneCodeId: z.string().optional().transform(v => v === "" ? undefined : v).pipe(z.string().uuid().optional()),
  colorCodeId: z.string().optional().transform(v => v === "" ? undefined : v).pipe(z.string().uuid().optional()),
  cutCodeId: z.string().optional().transform(v => v === "" ? undefined : v).pipe(z.string().uuid().optional()),
  collectionCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  rashiCodeIds: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : []),
  shape: z.string().optional(),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().min(0, "Weight must be non-negative"),
  weightUnit: z.string(),
  treatment: z.string().optional(),
  certification: z.string().optional(),
  vendorId: z.string().uuid("Invalid vendor"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  stockLocation: z.string().optional(),
  notes: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  
  // Bracelet Attributes
  braceletType: z.string().optional(),
  beadSizeMm: z.coerce.number().optional(),
  beadCount: z.coerce.number().int().optional(),
  holeSizeMm: z.coerce.number().optional(),
  innerCircumferenceMm: z.coerce.number().optional(),
  standardSize: z.string().optional(),
});

// Mock Data based on screenshot
const mockData = {
  itemName: "Medium",
  internalName: "Blue Sapphire",
  category: "Bracelet (BRA)", // This is what form sends
  gemType: "Sapphire (SAP)",
  shape: "Round",
  weightValue: "45",
  weightUnit: "gms",
  weightRatti: "245.25", // Form sends this too
  braceletType: "Elastic",
  standardSize: "M",
  beadSizeMm: "8",
  beadCount: "27",
  innerCircumferenceMm: "12",
  holeSizeMm: "0.5",
  vendorId: "c2c62483-3660-4966-9e66-93108085188f", // Fake UUID
  pricingMode: "FLAT",
  flatPurchaseCost: "300",
  flatSellingPrice: "800",
  stockLocation: "Box A1",
  mediaUrls: ["http://res.cloudinary.com/demo/image/upload/v1/sample.jpg"], // As array
  // categoryCodeId: undefined, // Let's simulate missing
};

// Simulate server action processing
const formData = new FormData();
Object.entries(mockData).forEach(([key, value]) => {
    if (Array.isArray(value)) {
        // Form behavior: appends comma separated AND individual items
        formData.append(key, value.join(","));
        value.forEach(v => formData.append(key, v));
    } else {
        formData.append(key, String(value));
    }
});

const raw = Object.fromEntries(formData.entries());
const mediaUrls = formData.getAll('mediaUrls').map(String).filter(Boolean);

console.log("Raw Data:", raw);

const parsed = inventorySchema.safeParse({
    ...raw,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
});

if (!parsed.success) {
    console.error("Validation Failed:", JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
} else {
    console.log("Validation Passed!");
}

// Test Case 2: Empty Numeric Fields
console.log("\n--- Test Case 2: Empty Numeric Fields ---");
const emptyNumData = {
    ...mockData,
    beadSizeMm: "",
    beadCount: "",
};
const parsedEmpty = inventorySchema.safeParse({
    ...emptyNumData,
    mediaUrls: ["url"]
});
if (!parsedEmpty.success) {
    console.error("Empty Num Validation Failed:", JSON.stringify(parsedEmpty.error.flatten().fieldErrors, null, 2));
} else {
    console.log("Empty Num Validation Passed! beadSizeMm =", parsedEmpty.data.beadSizeMm, "beadCount =", parsedEmpty.data.beadCount);
}

// Test Case 3: Invalid Bead Count (Float)
console.log("\n--- Test Case 3: Float Bead Count ---");
const floatCountData = {
    ...mockData,
    beadCount: "27.5",
};
const parsedFloat = inventorySchema.safeParse(floatCountData);
if (!parsedFloat.success) {
    console.error("Float Count Validation Failed:", JSON.stringify(parsedFloat.error.flatten().fieldErrors, null, 2));
} else {
    console.log("Float Count Validation Passed!");
}
