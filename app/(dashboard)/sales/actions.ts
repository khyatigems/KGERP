"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { randomBytes } from "crypto";
import { InvoiceData } from "@/lib/invoice-generator";
import { postJournalEntry, getAccountByCode, ACCOUNTS } from "@/lib/accounting";

const saleSchema = z.object({
  inventoryId: z.string().uuid("Please select an item"),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.coerce.date(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
  discount: z.coerce.number().min(0).optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  shippingMethod: z.string().optional(),
  trackingId: z.string().optional(),
  remarks: z.string().optional(),
  quotationId: z.string().optional(),
});

function generateInvoiceToken() {
  return randomBytes(16).toString("hex");
}

export async function createSale(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.SALES_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const rawData = Object.fromEntries(formData.entries());
  const invoiceDisplayOptions = formData.get("invoiceDisplayOptions") as string | null;

  const parsed = saleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { message: "Invalid data", errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
      // Check if item exists and is in stock
      const item = await prisma.inventory.findUnique({ where: { id: data.inventoryId }});
      if (!item) return { message: "Item not found" };
      if (item.status !== "IN_STOCK" && item.status !== "RESERVED") {
          return { message: "Item is not available for sale" };
      }

      const sellingPrice = data.sellingPrice;
      const discount = data.discount || 0;
      const netAmount = sellingPrice - discount;
      
      // Calculate profit
      // Profit = NetAmount - (PurchaseCost + Expenses)
      // For now, simple: NetAmount - (FlatPurchaseCost || (Weight * Rate))
      let cost = item.flatPurchaseCost || 0;
      if (cost === 0 && item.purchaseRatePerCarat && item.weightValue) {
          cost = item.purchaseRatePerCarat * item.weightValue; // Assuming cts
      }
      
      const profit = netAmount - cost;

      await prisma.$transaction(async (tx) => {
          // 1. Create Sale
          const sale = await tx.sale.create({
              data: {
                  inventoryId: data.inventoryId,
                  platform: data.platform,
                  saleDate: data.saleDate,
                  customerName: data.customerName,
                  customerPhone: data.customerPhone,
                  customerEmail: data.customerEmail,
                  customerCity: data.customerCity,
                  salePrice: data.sellingPrice,
                  discountAmount: data.discount || 0,
                  netAmount: netAmount,
                  profit: profit,
                  // paymentMode: data.paymentMode,
                  paymentMethod: data.paymentMode, 
                  paymentStatus: data.paymentStatus || "PENDING",
                  // shippingMethod: data.shippingMethod, // Not in schema
                  // trackingId: data.trackingId, // Not in schema
                  notes: data.remarks,
              }
          });

          // 2. Update Inventory Status
          await tx.inventory.update({
              where: { id: data.inventoryId },
              data: { status: "SOLD" }
          });

          // 3. Generate Invoice
          // Invoice Number: INV-YYYY-SEQUENCE
          const year = new Date().getFullYear();
          
          // Fetch all invoice numbers for the current year to determine the next sequence accurately
          const existingInvoices = await tx.invoice.findMany({
              where: {
                  invoiceNumber: {
                      startsWith: `INV-${year}-`
                  }
              },
              select: {
                  invoiceNumber: true
              }
          });

          let maxSequence = 0;
          
          for (const inv of existingInvoices) {
              const parts = inv.invoiceNumber.split('-');
              if (parts.length >= 3) {
                  const seqPart = parts[2];
                  // Extract numeric part even if there are suffixes
                  const match = seqPart.match(/^(\d+)/);
                  if (match) {
                      const seq = parseInt(match[1]);
                      if (!isNaN(seq) && seq > maxSequence) {
                          maxSequence = seq;
                      }
                  }
              }
          }

          let nextSequence = maxSequence + 1;
          let invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, '0')}`;
          
          // Retry logic for collision handling (up to 5 times)
          let retries = 0;
          while (retries < 5) {
              const collision = await tx.invoice.findUnique({
                  where: { invoiceNumber }
              });
              
              if (!collision) break;
              
              // If collision, increment and try again
              nextSequence++;
              invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, '0')}`;
              retries++;
          }
          
          if (retries >= 5) {
             throw new Error(`Failed to generate unique invoice number after multiple attempts. Last tried: ${invoiceNumber}`);
          }

          const token = generateInvoiceToken();

          const newInvoice = await tx.invoice.create({
              data: {
                  invoiceNumber,
                  token,
                  isActive: true,
                  subtotal: netAmount,
                  taxTotal: 0, 
                  discountTotal: data.discount || 0,
                  totalAmount: netAmount,
                  displayOptions: invoiceDisplayOptions
              }
          });

          // 4. Update Quotation Status if linked and handle other quotations with same item
          if (data.quotationId) {
              // 4a. Update the accepted quotation
              await tx.quotation.update({
                  where: { id: data.quotationId },
                  data: { status: "CONVERTED" }
              });

              // 4b. Find other ACTIVE/SENT/PENDING quotations containing this item
              // We need to find QuotationItems with this inventoryId, 
              // then check their parent Quotation status.
              // Note: Prisma doesn't support deep filtering in updateMany easily, 
              // so we fetch relevant quotation IDs first.
              
              const otherQuotationItems = await tx.quotationItem.findMany({
                  where: {
                      inventoryId: data.inventoryId,
                      quotationId: { not: data.quotationId }, // Exclude the one we just accepted
                      quotation: {
                          status: { in: ["DRAFT", "SENT", "PENDING_APPROVAL", "ACTIVE"] }
                      }
                  },
                  select: { quotationId: true }
              });

              if (otherQuotationItems.length > 0) {
                  const quotationIdsToExpire = [...new Set(otherQuotationItems.map(i => i.quotationId))];
                  
                  // Expire them
                  await tx.quotation.updateMany({
                      where: {
                          id: { in: quotationIdsToExpire }
                      },
                      data: {
                          status: "EXPIRED"
                      }
                  });
              }
          } else {
              // Even if not directly linked to a quotation ID (e.g. manual sale),
              // we should still expire any active quotations that included this item.
              const quotationItemsWithItem = await tx.quotationItem.findMany({
                  where: {
                      inventoryId: data.inventoryId,
                      quotation: {
                          status: { in: ["DRAFT", "SENT", "PENDING_APPROVAL", "ACTIVE"] }
                      }
                  },
                  select: { quotationId: true }
              });

              if (quotationItemsWithItem.length > 0) {
                  const quotationIdsToExpire = [...new Set(quotationItemsWithItem.map(i => i.quotationId))];
                  
                  await tx.quotation.updateMany({
                      where: {
                          id: { in: quotationIdsToExpire }
                      },
                      data: {
                          status: "EXPIRED"
                      }
                  });
              }
          }

          // 5. Update Sale with Invoice ID (New Relation)
          await tx.sale.update({
              where: { id: sale.id },
              data: { invoiceId: newInvoice.id }
          });

          // 6. Accounting Entry (Double Entry)
          try {
              const acAR = await getAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, tx);
              const acSales = await getAccountByCode(ACCOUNTS.INCOME.SALES, tx);
              
              await postJournalEntry({
                  date: new Date(),
                  description: `Invoice #${invoiceNumber} - ${data.customerName || "Walk-in"}`,
                  referenceType: "INVOICE",
                  referenceId: newInvoice.id,
                  userId: session.user.id,
                  lines: [
                      { accountId: acAR.id, debit: netAmount },
                      { accountId: acSales.id, credit: netAmount }
                  ]
              }, tx);
          } catch (accError) {
              console.error("Accounting Entry Failed:", accError);
              throw accError; // Ensure data consistency
          }
      });

      await logActivity({
          entityType: "Sale",
          entityId: data.inventoryId, // or sale ID, but inventoryId is good for tracking item history
          entityIdentifier: item.sku,
          actionType: "CREATE", // or STATUS_CHANGE
          source: "WEB",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          newData: data
      });

  } catch (e) {
      console.error("Create Sale Error:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to create sale";
      return { message: errorMessage };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  // redirect("/sales");
  return { success: true, message: "Sale created successfully. Invoice Generated." };
}

export async function deleteSale(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  if (!hasPermission(session.user.role || "STAFF", PERMISSIONS.SALES_DELETE)) {
      return { message: "Insufficient permissions" };
  }

  const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
          inventory: true
      }
  });

  if (!sale) return { message: "Sale not found" };

  try {
      await prisma.$transaction(async (tx) => {
          await tx.inventory.update({
              where: { id: sale.inventoryId },
              data: { status: "IN_STOCK" }
          });

          await tx.sale.delete({
              where: { id }
          });

          // Delete related invoice?
          // Sale has invoiceId, Invoice has sales (relation "NewInvoice")
          // If this was the only sale on that invoice, maybe delete invoice?
          // For now, let's skip deleting invoice automatically unless we implement strict rules.
          // Or if we know the invoiceId:
          if (sale.invoiceId) {
             // Optional: check if other sales use this invoice
             const otherSales = await tx.sale.count({ where: { invoiceId: sale.invoiceId, id: { not: id } }});
             if (otherSales === 0) {
                 await tx.invoice.delete({ where: { id: sale.invoiceId } });
             }
          }
      });

      await logActivity({
          entityType: "Sale",
          entityId: id,
          entityIdentifier: sale.inventory.sku,
          actionType: "DELETE",
          source: "WEB",
          userId: session.user?.id || "system",
          userName: session.user?.name || "Unknown",
      });

  } catch (e) {
      console.error(e);
      return { message: "Failed to delete sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
}

export async function getInvoiceDataForThermal(saleId: string): Promise<InvoiceData | null> {
    const session = await auth();
    if (!session) return null;

    // 1. Find Sale and its Invoice
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            invoice: {
                include: {
                    sales: {
                        include: {
                            inventory: {
                                include: {
                                    certificates: true,
                                    rashis: true
                                }
                            }
                        }
                    },
                    quotation: {
                        include: {
                            customer: true
                        }
                    }
                }
            }
        }
    });

    if (!sale || !sale.invoice) return null;

    const invoice = sale.invoice;
    const companySettings = await prisma.companySettings.findFirst();
    const invoiceSettings = await prisma.invoiceSettings.findFirst();
    const paymentSettings = await prisma.paymentSettings.findFirst();

    // Parse GST Rates
    let gstRates: Record<string, string> = {};
    try {
        if (invoiceSettings?.categoryGstRates) {
            gstRates = JSON.parse(invoiceSettings.categoryGstRates);
        }
    } catch (e) {
        console.error("Failed to parse GST rates", e);
    }

    // Parse Display Options
    let displayOptions = {
        showWeight: true,
        showRatti: true,
        showDimensions: true,
        showGemType: true,
        showCategory: true,
        showColor: true,
        showShape: true,
        showRashi: true,
        showCertificates: true,
        showSku: true,
        showPrice: true,
    };

    if (invoice.displayOptions) {
        try {
            const parsed = JSON.parse(invoice.displayOptions);
            displayOptions = { ...displayOptions, ...parsed };
        } catch (e) {
            console.error("Failed to parse display options", e);
        }
    }

    // Process Items
    const salesItems = invoice.sales;
    const processedItems = salesItems.map((item) => {
        const category = item.inventory.category || "General";
        let rateStr = "3";
        if (gstRates && typeof gstRates === 'object') {
            rateStr = gstRates[category] || gstRates[item.inventory.itemName] || "3";
        }
        const gstRate = parseFloat(rateStr) || 3;

        const inclusivePrice = item.salePrice || item.netAmount || 0;
        const basePrice = inclusivePrice / (1 + (gstRate / 100));
        const gstAmount = inclusivePrice - basePrice;

        // Description Construction
        const descriptionParts: string[] = [];
        descriptionParts.push(item.inventory.itemName);

        const details: string[] = [];
        if (displayOptions.showWeight) details.push(`${item.inventory.weightValue} ${item.inventory.weightUnit}`);
        if (displayOptions.showRatti && item.inventory.weightRatti) details.push(`Ratti: ${item.inventory.weightRatti}`);
        if (displayOptions.showDimensions && (item.inventory.dimensionsMm || item.inventory.measurements)) details.push(`Dim: ${item.inventory.dimensionsMm || item.inventory.measurements}`);
        if (displayOptions.showGemType && item.inventory.gemType) details.push(`Type: ${item.inventory.gemType}`);
        if (displayOptions.showColor && item.inventory.color) details.push(`Color: ${item.inventory.color}`);
        if (displayOptions.showShape && item.inventory.shape) details.push(`Shape: ${item.inventory.shape}`);
        
        if (details.length > 0) descriptionParts.push(details.join(" • "));

        if (displayOptions.showPrice && item.inventory.pricingMode === "PER_CARAT") {
            descriptionParts.push(`Rate: ${item.inventory.sellingRatePerCarat}/ct`);
        }

        return {
            sku: displayOptions.showSku ? item.inventory.sku : "",
            description: descriptionParts.join("\n"),
            quantity: 1,
            unitPrice: item.salePrice, // Note: using salePrice here but might need basePrice depending on calculation
            basePrice: basePrice,
            gstRate,
            gstAmount,
            total: item.netAmount || (inclusivePrice - (item.discountAmount || 0)) || 0,
            discountAmount: item.discountAmount || 0
        };
    });

    // Totals
    const subtotalBase = processedItems.reduce((sum, item) => sum + item.basePrice, 0);
    const totalGst = processedItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const discount = processedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const total = processedItems.reduce((sum, item) => sum + item.total, 0);

    // Payment Status
    const allPaid = salesItems.every((s) => s.paymentStatus === "PAID");
    const anyPaidOrPartial = salesItems.some((s) => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
    let paymentStatus = "UNPAID";
    if (allPaid) paymentStatus = "PAID";
    else if (anyPaidOrPartial) paymentStatus = "PARTIAL";

    const isPaid = paymentStatus === "PAID";
    const amountReceived = salesItems.reduce((sum, item) => {
        if (item.paymentStatus === "PAID") return sum + (item.netAmount || item.salePrice);
        return sum;
    }, 0);
    const balanceDue = isPaid ? 0 : Math.max(0, total - amountReceived);

    // Customer
    // Prefer sale customer, then invoice/quotation customer
    const customerName = sale.customerName || invoice.quotation?.customer?.name || "Walk-in Customer";
    const customerAddress = sale.customerCity || invoice.quotation?.customer?.city || invoice.quotation?.customer?.address || "";
    const customerPhone = sale.customerPhone || invoice.quotation?.customer?.phone || "";
    const customerEmail = sale.customerEmail || invoice.quotation?.customer?.email || "";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://khyatigems.com";
    const publicUrl = invoice.token ? `${baseUrl}/invoice/${invoice.token}` : undefined;

    return {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.createdAt,
        publicUrl,
        token: invoice.token,
        company: {
            name: companySettings?.companyName || "KhyatiGems",
            address: companySettings?.address || "",
            email: companySettings?.email || "",
            phone: companySettings?.phone || "",
            gstin: companySettings?.gstin || undefined,
            logoUrl: companySettings?.invoiceLogoUrl || companySettings?.logoUrl || undefined,
        },
        customer: {
            name: customerName,
            address: customerAddress,
            phone: customerPhone,
            email: customerEmail,
        },
        items: processedItems.map(item => ({
            sku: item.sku,
            description: item.description,
            quantity: 1,
            unitPrice: item.basePrice,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,
            total: item.total
        })),
        subtotal: subtotalBase,
        discount,
        tax: totalGst,
        total,
        amountPaid: amountReceived,
        balanceDue,
        status: isPaid ? "PAID" : "DUE",
        paymentStatus,
        terms: invoiceSettings?.terms || undefined,
        notes: invoiceSettings?.footerNotes || undefined,
        bankDetails: paymentSettings?.bankEnabled ? {
            bankName: paymentSettings.bankName || "",
            accountNumber: paymentSettings.accountNumber || "",
            ifsc: paymentSettings.ifscCode || "",
            holder: paymentSettings.accountHolder || "",
        } : undefined
    };
}
