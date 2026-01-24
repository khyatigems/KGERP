import { z } from "zod";

export const quotationItemSchema = z.object({
  inventoryId: z.string().optional(), // Optional because it might be a custom item? No, spec says sku_id UUID. But let's allow flexibility or require it. Existing system uses inventoryId.
  sku: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  
  // Pricing
  erpBasePrice: z.number().min(0).default(0),
  priceOverrideType: z.enum(["AMOUNT", "PERCENT"]).optional(),
  priceOverrideValue: z.number().optional(),
  finalUnitPrice: z.number().min(0).default(0),
  
  quantity: z.number().min(1).default(1),
  subtotal: z.number().default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  
  expiryDate: z.coerce.date(),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

export const updateQuotationSchema = createQuotationSchema.partial();
