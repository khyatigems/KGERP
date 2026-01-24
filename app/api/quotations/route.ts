import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createQuotationSchema } from "@/lib/schemas/quotation";
import { generateQuotationToken } from "@/lib/tokens";

export async function POST(req: Request) {
  try {
    const session = await auth();
    // Assuming permissions are checked here or we just allow authenticated users for now
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createQuotationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const data = parsed.data;
    
    // 1. Fetch Inventory Items if inventoryId is provided
    const inventoryIds = data.items.map(i => i.inventoryId).filter(Boolean) as string[];
    const inventoryItems = await prisma.inventory.findMany({
      where: { id: { in: inventoryIds } }
    });
    
    const inventoryMap = new Map(inventoryItems.map(i => [i.id, i]));
    
    let totalAmount = 0;
    const quotationItemsData = [];

    // 2. Calculate Prices & Overrides
    for (const itemInput of data.items) {
      let invItem = null;
      if (itemInput.inventoryId) {
        invItem = inventoryMap.get(itemInput.inventoryId);
      }

      // If inventory item exists, use its data for defaults, otherwise trust input (or fail?)
      // Spec says "sku_id UUID", implying linkage.
      
      let itemName = itemInput.itemName;
      let weight = "";
      let erpBasePrice = itemInput.erpBasePrice;

      if (invItem) {
        itemName = invItem.itemName;
        weight = `${invItem.weightValue} ${invItem.weightUnit}`;
        
        // Calculate Base Price from ERP if not provided or to validate
        if (invItem.pricingMode === "PER_CARAT") {
          erpBasePrice = (invItem.sellingRatePerCarat || 0) * (invItem.weightValue || 0);
        } else {
          erpBasePrice = invItem.flatSellingPrice || 0;
        }
      }
      
      // Calculate Final Price with Override
      let finalUnitPrice = erpBasePrice;
      
      if (itemInput.priceOverrideType === "AMOUNT") {
        // Fixed Price Override
        if (itemInput.priceOverrideValue !== undefined) {
             finalUnitPrice = itemInput.priceOverrideValue;
        }
      } else if (itemInput.priceOverrideType === "PERCENT") {
         // Discount Percent Override
         if (itemInput.priceOverrideValue !== undefined) {
             const discount = (erpBasePrice * itemInput.priceOverrideValue) / 100;
             finalUnitPrice = erpBasePrice - discount;
         }
      } else {
          // No override, check if finalUnitPrice was explicitly sent, else use base
          if (itemInput.finalUnitPrice > 0) {
              finalUnitPrice = itemInput.finalUnitPrice;
          }
      }
      
      const subtotal = finalUnitPrice * itemInput.quantity;
      totalAmount += subtotal;
      
      quotationItemsData.push({
        inventoryId: invItem?.id,
        sku: invItem?.sku,
        itemName,
        weight,
        
        erpBasePrice,
        priceOverrideType: itemInput.priceOverrideType,
        priceOverrideValue: itemInput.priceOverrideValue,
        finalUnitPrice,
        quantity: itemInput.quantity,
        subtotal,
        
        // Legacy mapping
        quotedPrice: subtotal
      });
    }

    // 3. Generate Quotation Number
    const count = await prisma.quotation.count();
    const year = new Date().getFullYear();
    const quotationNumber = `QTN-${year}-${(count + 1).toString().padStart(4, "0")}`;
    const token = generateQuotationToken();
    
    // 4. Create Quotation
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        customerName: data.customerName || "Unknown Customer",
        customerMobile: data.customerMobile,
        customerEmail: data.customerEmail,
        customerCity: data.customerCity,
        
        expiryDate: data.expiryDate,
        status: "DRAFT", // Always starts as DRAFT
        totalAmount,
        token,
        
        createdById: session.user.id,
        
        items: {
          create: quotationItemsData.map(item => ({
              inventoryId: item.inventoryId as string, // Assuming it's valid if we got here
              quotedPrice: item.quotedPrice
          }))
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(quotation);

  } catch (e) {
    console.error("Create Quotation Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
