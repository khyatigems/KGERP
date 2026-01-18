"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateQuotationToken } from "@/lib/tokens";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const quotationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  expiryDate: z.coerce.date(),
  itemIds: z.array(z.string()).min(1, "Select at least one item"),
});

export async function createQuotation(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  // Parse itemIds from JSON string if needed, or handle array from FormData
  // FormData handling for arrays can be tricky.
  // We'll assume the client sends 'itemIds' as a JSON string or we process getAll.
  
  const raw = Object.fromEntries(formData.entries());
  
  // Handle itemIds separately if passed as JSON string
  let itemIds: string[] = [];
  if (typeof raw.itemIds === 'string') {
      try {
          itemIds = JSON.parse(raw.itemIds);
      } catch (e) {
          // If not JSON, maybe it's just a single value? 
          // But for multi-select, JSON string is safer in FormData.
          itemIds = [raw.itemIds];
      }
  }

  const payload = {
      ...raw,
      itemIds
  };

  const parsed = quotationSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Fetch items to calculate totals and get details
  const items = await prisma.inventory.findMany({
      where: {
          id: { in: data.itemIds },
          status: "IN_STOCK" // Only allow in-stock items
      }
  });

  if (items.length !== data.itemIds.length) {
      return { message: "Some items are no longer available" };
  }

  // Calculate Total
  let totalAmount = 0;
  const quotationItems = items.map(item => {
      let price = 0;
      if (item.pricingMode === "PER_CARAT") {
          price = (item.sellingRatePerCarat || 0) * item.weightValue;
      } else {
          price = item.flatSellingPrice || 0;
      }
      totalAmount += price;
      
      return {
          inventoryId: item.id,
          sku: item.sku,
          itemName: item.itemName,
          weight: `${item.weightValue} ${item.weightUnit}`,
          quotedPrice: price
      };
  });

  try {
      await prisma.$transaction(async (tx) => {
          // Generate Quotation Number (Simple Auto-increment logic or Date-based)
          // For simplicity, using Q-TIMESTAMP-RANDOM or just count
          const count = await tx.quotation.count();
          const quotationNumber = `Q-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
          
          const token = generateQuotationToken();

          await tx.quotation.create({
              data: {
                  quotationNumber,
                  customerName: data.customerName,
                  customerMobile: data.customerMobile,
                  customerEmail: data.customerEmail,
                  customerCity: data.customerCity,
                  expiryDate: data.expiryDate,
                  totalAmount,
                  token,
                  status: "ACTIVE",
                  items: {
                      create: quotationItems
                  }
              }
          });
      });
  } catch (e) {
      console.error(e);
      return { message: "Failed to create quotation" };
  }

  revalidatePath("/quotes");
  redirect("/quotes");
}
