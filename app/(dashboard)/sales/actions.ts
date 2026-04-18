"use server";

import { z } from "zod";
import { ensureBillfreePhase1Schema, ensureInvoiceSupportSchema, hasTable, prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { applyCreditNotesOnInvoiceCreation } from "@/lib/invoice-payment";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import crypto, { randomBytes } from "crypto";
import { InvoiceData } from "@/lib/invoice-generator";
import { Prisma } from "@prisma/client";
import { postJournalEntry, getOrCreateAccountByCode, ACCOUNTS, PrismaTx } from "@/lib/accounting";
import { normalizeDateToUtcNoon } from "@/lib/date";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";
import { assertNotFrozen, getGovernanceConfig } from "@/lib/governance";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";
import { accrueLoyaltyPoints } from "@/lib/loyalty-accrual";

const saleItemSchema = z.object({
  inventoryId: z.string().uuid("Please select an item"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be non-negative"),
  usdPrice: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().min(0.01, "USD price must be greater than 0").optional()
  ),
  discount: z.coerce.number().min(0).default(0),
});

const initialPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be positive"),
  method: z.string().min(1, "Payment method is required"),
  date: z.coerce.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const saleSchema = z.object({
  invoiceType: z.enum(["TAX_INVOICE", "EXPORT_INVOICE"]).default("TAX_INVOICE"),
  iecCode: z.string().optional(),
  exportType: z.enum(["LUT", "BOND", "PAYMENT"]).optional(),
  countryOfDestination: z.string().optional(),
  portOfDispatch: z.string().optional(),
  modeOfTransport: z.enum(["AIR", "COURIER", "HAND_DELIVERY"]).optional(),
  courierPartner: z.string().optional(),
  trackingId: z.string().optional(),
  platformOrderId: z.string().optional(),
  invoiceCurrency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  conversionRate: z.coerce.number().min(0).optional(),
  totalInrValue: z.coerce.number().min(0).optional(),
  items: z.array(saleItemSchema).min(1, "Select at least one item"),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.coerce.date(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  customerCity: z.string().optional(),
  placeOfSupply: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCharge: z.coerce.number().min(0).optional(),
  additionalCharge: z.coerce.number().min(0).optional(),
  paymentMode: z.string().optional(),
  singlePaymentReference: z.string().optional(),
  paymentStatus: z.string().optional(),
  shippingMethod: z.string().optional(),
  remarks: z.string().optional(),
  quotationId: z.string().optional(),
  autoFillSplitFromSingle: z.coerce.boolean().optional().default(true),
  initialPayments: z.array(initialPaymentSchema).optional().default([]),
  couponCode: z.string().optional(),
  loyaltyRedeemAmount: z.coerce.number().min(0).optional().default(0),
  discountType: z.enum(["none", "flat", "coupon"]).optional().default("none"),
  flatDiscount: z.coerce.number().min(0).optional().default(0),
});

function generateInvoiceToken() {
  return randomBytes(16).toString("hex");
}

async function ensureCustomerCode(tx: PrismaTx, customerId: string) {
  const rows = await tx.$queryRawUnsafe<Array<{ code: string }>>(
    `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
    customerId
  );
  if (rows.length) return rows[0].code;
  const year2 = String(new Date().getFullYear()).slice(-2);
  let code = "";
  for (let i = 0; i < 30; i++) {
    const rnd = crypto.randomInt(0, 1000000);
    const candidate = `C${year2}-${String(rnd).padStart(6, "0")}`;
    const collision = await tx.$queryRawUnsafe<Array<{ code: string }>>(
      `SELECT code FROM CustomerCode WHERE code = ? LIMIT 1`,
      candidate
    );
    if (!collision.length) {
      code = candidate;
      break;
    }
  }
  if (code) {
    await tx.$executeRawUnsafe(
      `INSERT INTO CustomerCode (id, customerId, code, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      customerId,
      code
    );
  }
  return code || null;
}

type InvoiceClient = { invoice: typeof prisma.invoice };

function extractInvoiceSequence(invoiceNumber: string): number {
  const [, , seqPart] = invoiceNumber.split("-");
  if (!seqPart) return 0;
  const match = seqPart.match(/^(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : 0;
}

async function computeNextInvoiceNumber(client: InvoiceClient, year = new Date().getFullYear()) {
  const existingInvoices = await client.invoice.findMany({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`,
      },
    },
    select: {
      invoiceNumber: true,
    },
  });

  let maxSequence = 0;
  for (const invoice of existingInvoices) {
    const seq = extractInvoiceSequence(invoice.invoiceNumber);
    if (seq > maxSequence) {
      maxSequence = seq;
    }
  }

  let nextSequence = maxSequence + 1;
  let invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, "0")}`;

  let retries = 0;
  while (retries < 5) {
    const collision = await client.invoice.findUnique({ where: { invoiceNumber } });
    if (!collision) break;
    nextSequence += 1;
    invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, "0")}`;
    retries += 1;
  }

  if (retries >= 5) {
    throw new Error(`Failed to compute next invoice number after collisions. Last tried: ${invoiceNumber}`);
  }

  return invoiceNumber;
}

export async function getNextInvoiceNumber() {
  const perm = await checkPermission(PERMISSIONS.SALES_CREATE);
  if (!perm.success) {
    return { success: false, message: perm.message };
  }

  await ensureInvoiceSupportSchema();

  try {
    const invoiceNumber = await computeNextInvoiceNumber(prisma);
    return { success: true, invoiceNumber };
  } catch (error) {
    console.error("Failed to compute next invoice number:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to compute invoice number" };
  }
}

export async function createSale(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.SALES_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }
  // Schema ensures removed for performance - run once at build/deploy time via migration
  // await ensureReturnsSchema();
  // await ensureBillfreePhase1Schema();
  // await ensureInvoiceSupportSchema();
  try {
    await assertNotFrozen("Sale creation");
  } catch (error) {
    return { message: error instanceof Error ? error.message : "System is in freeze mode" };
  }

  const rawData = Object.fromEntries(formData.entries());
  const invoiceDisplayOptions = formData.get("invoiceDisplayOptions") as string | null;

  if (invoiceDisplayOptions) {
    try {
      JSON.parse(invoiceDisplayOptions);
    } catch {
      return { message: "Invalid invoice display options" };
    }
  }

  let itemsData: { inventoryId: string; sellingPrice: number; usdPrice?: number; discount: number }[] = [];
  let initialPaymentsData: { amount: number; method: string; date: string; reference?: string; notes?: string }[] = [];
  let createdInvoiceId: string | null = null;
  let createdInvoiceNumber: string | null = null;
  try {
    if (typeof rawData.items === "string") {
      itemsData = JSON.parse(rawData.items);
    } else if (rawData.inventoryId && rawData.sellingPrice) {
      itemsData = [{
        inventoryId: String(rawData.inventoryId),
        sellingPrice: Number(rawData.sellingPrice),
        usdPrice: rawData.usdPrice ? Number(rawData.usdPrice) : undefined,
        discount: rawData.discount ? Number(rawData.discount) : 0
      }];
    }
    if (typeof rawData.initialPayments === "string") {
      initialPaymentsData = JSON.parse(rawData.initialPayments);
    }
  } catch {
    return { message: "Invalid items data" };
  }

  const payload = { ...rawData, items: itemsData, initialPayments: initialPaymentsData };
  const parsed = saleSchema.safeParse(payload);
  if (!parsed.success) {
    return { message: "Invalid data", errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const governance = await getGovernanceConfig();

  try {
      const itemIds = data.items.map(i => i.inventoryId);
      const inventoryItems = await prisma.inventory.findMany({
          where: { id: { in: itemIds } }
      });

      if (inventoryItems.length !== itemIds.length) {
          return { message: "One or more items not found" };
      }

      const inventoryMap = new Map(inventoryItems.map(i => [i.id, i]));

      for (const itemId of itemIds) {
          const inv = inventoryMap.get(itemId);
          if (!inv) return { message: "Item not found" };
          if (inv.status !== "IN_STOCK" && inv.status !== "RESERVED") {
              return { message: `Item ${inv.sku} is not available for sale` };
          }
          if (governance.blockSaleWithoutCertification && !(inv.certification || "").trim()) {
              return { message: `Certification is required before selling SKU ${inv.sku}` };
          }
      }

      if (governance.blockInvoiceWithoutCustomerName && !(data.customerName || "").trim()) {
        return { message: "Customer name is required to generate invoice under governance rules" };
      }

      const isExport = data.invoiceType === "EXPORT_INVOICE";
      if (isExport && !(data.conversionRate && data.conversionRate > 0)) {
        return { message: "Conversion rate is required for export invoices" };
      }
      const convRate = (isExport && data.conversionRate && data.conversionRate > 0) ? data.conversionRate : 1;

      if (isExport) {
        for (const item of data.items) {
          if (item.usdPrice == null || !Number.isFinite(Number(item.usdPrice)) || Number(item.usdPrice) <= 0) {
            return { message: "USD price is required for export invoices" };
          }
        }
      } else {
        for (const item of data.items) {
          if (item.sellingPrice == null || !Number.isFinite(Number(item.sellingPrice)) || Number(item.sellingPrice) <= 0) {
            return { message: "Selling price is required" };
          }
        }
      }

      const computedItems = data.items.map((input) => {
          const inv = inventoryMap.get(input.inventoryId)!;
          const usdPrice = isExport ? (input.usdPrice || 0) : undefined;
          // For export invoices: salePrice is INR equivalent (usdPrice × conversionRate)
          // For domestic invoices: salePrice is the INR price directly
          const sellingPrice = isExport && usdPrice ? Number((usdPrice * convRate).toFixed(2)) : input.sellingPrice;
          const discount = input.discount || 0;
          const netAmount = sellingPrice - discount;
          let cost = inv.flatPurchaseCost || 0;
          if (cost === 0 && inv.purchaseRatePerCarat && inv.weightValue) {
              cost = inv.purchaseRatePerCarat * inv.weightValue;
          }
          const profit = netAmount - cost;
          return { inv, sellingPrice, usdPrice, discount, netAmount, profit, cost };
      });

      const shippingCharge = data.shippingCharge || 0;
      const additionalCharge = data.additionalCharge || 0;
      const itemGrossTotal = computedItems.reduce((sum, i) => sum + i.sellingPrice, 0);
      const totalItemDiscount = computedItems.reduce((sum, i) => sum + i.discount, 0);
      const totalGrossAmount = itemGrossTotal + shippingCharge + additionalCharge;
      const subtotalAfterItemDiscount = totalGrossAmount - totalItemDiscount;
      const allowedPaymentMethods = new Set(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE", "OTHER", "PAYPAL", "PAYONEER", "CC", "CREDIT_NOTE", "LOYALTY_REDEEM"]);

      let normalizedPayments = (data.initialPayments || []).map((p) => ({
        amount: Number(p.amount),
        method: p.method,
        date: new Date(p.date),
        reference: p.reference || undefined,
        notes: p.notes || undefined,
      }));

      if (normalizedPayments.length === 0 && data.autoFillSplitFromSingle) {
        const status = String(data.paymentStatus || "").toUpperCase();
        if (status === "PAID" && subtotalAfterItemDiscount > 0) {
          const singleRef = String(data.singlePaymentReference || "").trim();
          if (data.paymentMode === "CREDIT_NOTE" && !singleRef) {
            return { message: "Credit note code is required for Credit Note payment" };
          }
          normalizedPayments = [
            {
              amount: subtotalAfterItemDiscount,
              method: data.paymentMode || "CASH",
              date: data.saleDate,
              reference: data.paymentMode === "CREDIT_NOTE" ? singleRef : undefined,
              notes: "Auto-recorded at sale creation",
            }
          ];
        }
      }

      for (const payment of normalizedPayments) {
        if (!allowedPaymentMethods.has(payment.method)) {
          return { message: `Unsupported payment method: ${payment.method}` };
        }
        if (payment.method === "CREDIT_NOTE" && !String(payment.reference || "").trim()) {
          return { message: "Credit note code is required" };
        }
        if (!(payment.date instanceof Date) || Number.isNaN(payment.date.getTime())) {
          return { message: "Invalid payment date in initial payments" };
        }
      }

      if (data.autoFillSplitFromSingle && (data.paymentStatus || "").toUpperCase() === "PARTIAL" && normalizedPayments.length === 0) {
        return { message: "Add at least one payment entry for PARTIAL status" };
      }
      if (data.autoFillSplitFromSingle && (data.paymentStatus || "").toUpperCase() === "PAID" && normalizedPayments.length === 0) {
        return { message: "Add at least one payment entry or enable auto-fill split for PAID status" };
      }

      const canExportInvoice = isExport ? await hasTable("ExportInvoice") : false;

      await prisma.$transaction(async (tx) => {
          const customerNameInput = String(data.customerName || "").trim();
          const customerPhoneInput = String(data.customerPhone || "").trim().replace(/[^\d+]/g, "");
          const customerEmailInput = String(data.customerEmail || "").trim().toLowerCase();

          let customerProfile = data.customerId
            ? await tx.customer.findUnique({ where: { id: data.customerId } })
            : null;

          if (!customerProfile && customerNameInput) {
            const or: Array<Record<string, unknown>> = [];
            if (customerPhoneInput) or.push({ phone: customerPhoneInput });
            if (customerEmailInput) or.push({ email: customerEmailInput });
            const existing = or.length
              ? await tx.customer.findFirst({ where: { OR: or } as never })
              : null;
            customerProfile =
              existing ||
              (await tx.customer.create({
                data: {
                  name: customerNameInput,
                  phone: customerPhoneInput || null,
                  email: customerEmailInput || null,
                  address: (data.customerAddress || data.billingAddress || null) as unknown as never,
                  city: (data.customerCity || null) as unknown as never,
                } as unknown as never,
              }));

            await ensureCustomerCode(tx, customerProfile.id);
          }

          let couponDiscount = 0;
          let couponToRedeemId: string | null = null;
          const inputCouponCode = String(data.couponCode || "").trim().toUpperCase();
          if (inputCouponCode) {
            const couponRows = await tx.$queryRawUnsafe<Array<{
              id: string;
              type: string;
              value: number;
              maxDiscount: number | null;
              minInvoiceAmount: number | null;
              validFrom: string | null;
              validTo: string | null;
              usageLimitTotal: number | null;
              usageLimitPerCustomer: number | null;
              applicableScope: string;
              isActive: number;
            }>>(
              `SELECT id, type, value, maxDiscount, minInvoiceAmount, validFrom, validTo, usageLimitTotal, usageLimitPerCustomer, applicableScope, isActive
               FROM "Coupon" WHERE code = ? LIMIT 1`,
              inputCouponCode
            );
            const c = couponRows?.[0];
            if (!c || Number(c.isActive || 0) !== 1) throw new Error("Invalid or inactive coupon code");
            const nowTs = Date.now();
            if (c.validFrom && new Date(c.validFrom).getTime() > nowTs) throw new Error("Coupon is not active yet");
            if (c.validTo && new Date(c.validTo).getTime() < nowTs) throw new Error("Coupon expired");
            if (c.minInvoiceAmount != null && subtotalAfterItemDiscount + 0.009 < Number(c.minInvoiceAmount || 0)) throw new Error("Invoice amount below coupon minimum");
            const scope = String(c.applicableScope || "all");
            if (scope.startsWith("customer:")) {
              const targetCustomerId = scope.split(":")[1] || "";
              if (!customerProfile?.id || customerProfile.id !== targetCustomerId) throw new Error("Coupon not allowed for selected customer");
            }
            const totalUseRows = await tx.$queryRawUnsafe<Array<{ cnt: number }>>(
              `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ?`,
              c.id
            );
            if (c.usageLimitTotal != null && Number(totalUseRows?.[0]?.cnt || 0) >= Number(c.usageLimitTotal || 0)) throw new Error("Coupon usage limit reached");
            if (customerProfile?.id && c.usageLimitPerCustomer != null) {
              const custUseRows = await tx.$queryRawUnsafe<Array<{ cnt: number }>>(
                `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ? AND customerId = ?`,
                c.id,
                customerProfile.id
              );
              if (Number(custUseRows?.[0]?.cnt || 0) >= Number(c.usageLimitPerCustomer || 0)) throw new Error("Coupon per-customer usage limit reached");
            }
            const raw = c.type === "PERCENT" ? (subtotalAfterItemDiscount * Number(c.value || 0)) / 100 : Number(c.value || 0);
            couponDiscount = Math.max(0, Math.min(raw, c.maxDiscount != null ? Number(c.maxDiscount) : raw, subtotalAfterItemDiscount));
            couponToRedeemId = c.id;
          }

          // Calculate flat discount amount for invoice-level discount
          const flatDiscountAmount = data.discountType === "flat" ? (data.flatDiscount || 0) : 0;

          // Invoice-level flat discount is display-only (informational) and must NOT reduce payable total.
          // Only coupon discount affects payable total.
          const adjustedInvoiceTotal = Math.max(0, subtotalAfterItemDiscount - couponDiscount);
          const inputLoyaltyRedeem = Math.max(0, Number(data.loyaltyRedeemAmount || 0));
          let loyaltyRedeemAmount = 0;
          let loyaltyPointsUsed = 0;
          if (inputLoyaltyRedeem > 0) {
            if (!customerProfile?.id) throw new Error("Customer is required for loyalty redemption");
            const lsRows = await tx.$queryRawUnsafe<Array<{ redeemRupeePerPoint: number; minRedeemPoints: number; maxRedeemPercent: number }>>(
              `SELECT redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
            );
            const ls = lsRows?.[0] || { redeemRupeePerPoint: 1, minRedeemPoints: 0, maxRedeemPercent: 30 };
            const redeemRupeePerPoint = Math.max(0.0001, Number(ls.redeemRupeePerPoint || 1));
            const minRedeemPoints = Math.max(0, Number(ls.minRedeemPoints || 0));
            const maxRedeemPercent = Math.max(0, Math.min(100, Number(ls.maxRedeemPercent || 30)));
            const balRows = await tx.$queryRawUnsafe<Array<{ points: number }>>(
              `SELECT COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
              customerProfile.id
            );
            const availablePoints = Number(balRows?.[0]?.points || 0);
            const maxByPercent = (adjustedInvoiceTotal * maxRedeemPercent) / 100;
            const maxByPoints = availablePoints * redeemRupeePerPoint;
            const maxAllowed = Math.max(0, Math.min(adjustedInvoiceTotal, maxByPercent, maxByPoints));
            if (inputLoyaltyRedeem > maxAllowed + 0.009) throw new Error(`Loyalty redemption exceeds allowed limit (${maxAllowed.toFixed(2)})`);
            const neededPoints = Math.round(inputLoyaltyRedeem / redeemRupeePerPoint); // Standard rounding (0.5+ rounds up, <0.5 rounds down)
            if (neededPoints + 0.0001 < minRedeemPoints) throw new Error(`Minimum redeem points is ${minRedeemPoints}`);
            if (neededPoints > availablePoints + 0.0001) throw new Error("Insufficient loyalty points");
            loyaltyRedeemAmount = inputLoyaltyRedeem;
            loyaltyPointsUsed = neededPoints;
          }

          const allPayments = [...normalizedPayments];
          if (loyaltyRedeemAmount > 0) {
            allPayments.push({
              amount: loyaltyRedeemAmount,
              method: "LOYALTY_REDEEM",
              date: new Date(data.saleDate),
              reference: undefined,
              notes: `Loyalty redemption (${loyaltyPointsUsed} pts)`, // No decimal display
            });
          }
          const paidAmount = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          if (paidAmount > adjustedInvoiceTotal + 0.009) throw new Error(`Initial payments exceed invoice total by ${(paidAmount - adjustedInvoiceTotal).toFixed(2)}`);
          const invoicePaymentStatus =
            paidAmount >= adjustedInvoiceTotal - 0.01
              ? "PAID"
              : paidAmount > 0
              ? "PARTIAL"
              : data.paymentStatus === "PARTIAL"
              ? "PARTIAL"
              : "UNPAID";

          // 1. Generate Invoice
          // Invoice Number: INV-YYYY-SEQUENCE
          const invoiceNumber = await computeNextInvoiceNumber(tx);

          const token = generateInvoiceToken();

          // Persisted discountTotal should reflect discounts that actually reduce payable total.
          // Flat discount is display-only and excluded from discountTotal.
          const totalDiscountAmount = totalItemDiscount + couponDiscount;
          
          // Build displayOptions with invoice discount info
          let displayOptionsObj: Record<string, unknown> = {};
          try {
            if (invoiceDisplayOptions) {
              displayOptionsObj = JSON.parse(invoiceDisplayOptions);
            }
          } catch {
            // ignore parse errors
          }
          
          // Add invoice discount to displayOptions so it shows on the invoice.
          // Flat discount is display-only and must NOT affect total calculations.
          if (flatDiscountAmount > 0) {
            displayOptionsObj = {
              ...displayOptionsObj,
              invoiceDiscountType: "AMOUNT",
              invoiceDiscountValue: flatDiscountAmount,
              showInvoiceDiscount: true,
              invoiceDiscountAffectsTotal: false
            };
          }
          
          const finalDisplayOptions = JSON.stringify(displayOptionsObj);

          const newInvoice = await tx.invoice.create({
              data: {
                  invoiceNumber: invoiceNumber,
                  token,
                  quotationId: data.quotationId || null,
                  isActive: true,
                  invoiceDate: normalizeDateToUtcNoon(data.saleDate),
                  subtotal: totalGrossAmount,
                  taxTotal: data.invoiceType === "EXPORT_INVOICE" ? 0 : 0, // Zero rated for export
                  discountTotal: totalDiscountAmount,
                  totalAmount: adjustedInvoiceTotal,
                  displayOptions: finalDisplayOptions,
                  paymentStatus: invoicePaymentStatus,
                  paidAmount: paidAmount >= adjustedInvoiceTotal - 0.01 ? adjustedInvoiceTotal : paidAmount,
                  status: invoicePaymentStatus === "PAID" ? "PAID" : "ISSUED",
                  // Export invoice fields
                  invoiceType: data.invoiceType,
                  iecCode: data.iecCode || null,
                  exportType: data.exportType || null,
                  countryOfDestination: data.countryOfDestination || null,
                  portOfDispatch: data.portOfDispatch || null,
                  modeOfTransport: data.modeOfTransport || null,
                  courierPartner: data.courierPartner || null,
                  trackingId: data.trackingId || null,
                  invoiceCurrency: data.invoiceCurrency,
                  conversionRate: data.conversionRate || 1,
                  totalInrValue: data.totalInrValue || adjustedInvoiceTotal
              }
          });

          // Capture invoice details for response
          createdInvoiceId = newInvoice.id;
          createdInvoiceNumber = newInvoice.invoiceNumber;

          // Create ExportInvoice record for export invoices
          if (isExport && canExportInvoice) {
            const totalUsd = computedItems.reduce((sum, i) => sum + (i.usdPrice || 0), 0);
            // Create separate ExportInvoice record with export-specific details
            await tx.exportInvoice.create({
              data: {
                invoiceId: newInvoice.id,
                fobValue: totalUsd,
                buyerReference: data.platformOrderId || null,
              }
            });
          }

          // Create Journal Entry for Sale
          const arAccount = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, tx);
          const salesAccount = await getOrCreateAccountByCode(ACCOUNTS.INCOME.SALES, tx);
          const gstPayableAccount = await getOrCreateAccountByCode(ACCOUNTS.LIABILITIES.GST_PAYABLE, tx);

          const journalEntryInput = {
            referenceType: "INVOICE",
            referenceId: newInvoice.id,
            description: `Sale Invoice ${newInvoice.invoiceNumber}`,
            date: newInvoice.invoiceDate ?? new Date(),
            userId: session.user.id,
            lines: [
              {
                accountId: arAccount.id,
                debit: newInvoice.totalAmount,
                credit: 0,
                description: `Accounts Receivable for Invoice ${newInvoice.invoiceNumber}`,
              },
              {
                accountId: salesAccount.id,
                debit: 0,
                credit: newInvoice.subtotal,
                description: `Sales Revenue for Invoice ${newInvoice.invoiceNumber}`,
              },
              {
                accountId: gstPayableAccount.id,
                debit: 0,
                credit: newInvoice.taxTotal,
                description: `GST Payable for Invoice ${newInvoice.invoiceNumber}`,
              },
              {
                accountId: salesAccount.id,
                debit: newInvoice.discountTotal || 0,
                credit: 0,
                description: `Discount Allowed for Invoice ${newInvoice.invoiceNumber}`,
              },
            ],
          };
          await postJournalEntry(journalEntryInput, tx);

          if (couponToRedeemId) {
            await tx.$executeRawUnsafe(
              `INSERT INTO "CouponRedemption" (id, couponId, invoiceId, customerId, discountAmount, redeemedAt)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              crypto.randomUUID(),
              couponToRedeemId,
              newInvoice.id,
              customerProfile?.id || null,
              couponDiscount
            );
          }

          if (loyaltyRedeemAmount > 0 && customerProfile?.id) {
            await tx.$executeRawUnsafe(
              `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
               VALUES (?, ?, ?, 'REDEEM', ?, ?, ?, CURRENT_TIMESTAMP)`,
              crypto.randomUUID(),
              customerProfile.id,
              newInvoice.id,
              -loyaltyPointsUsed,
              -loyaltyRedeemAmount,
              "Redeemed at sale creation"
            );
          }

          // 2. Create Sales and Update Inventory
          for (const itemData of computedItems) {
              const customerNameFinal = customerProfile?.name || data.customerName;
              const customerPhoneFinal = customerProfile?.phone || data.customerPhone;
              const customerEmailFinal = customerProfile?.email || data.customerEmail;
              const customerAddressFinal = customerProfile?.address || data.customerAddress || data.billingAddress;
              const customerCityFinal = customerProfile?.city || data.customerCity;
              const placeOfSupplyFinal = customerCityFinal || data.placeOfSupply;
              const billingAddressFinal = customerAddressFinal || data.billingAddress;
              const shippingAddressFinal = data.shippingAddress || customerAddressFinal;

              const saleData = {
                inventoryId: itemData.inv.id,
                platform: data.platform,
                orderId: data.platformOrderId || null,
                saleDate: data.saleDate,
                customerId: customerProfile?.id || undefined,
                customerName: customerNameFinal,
                customerPhone: customerPhoneFinal,
                customerEmail: customerEmailFinal,
                customerAddress: customerAddressFinal,
                billingAddress: billingAddressFinal,
                customerCity: customerCityFinal,
                placeOfSupply: placeOfSupplyFinal,
                shippingAddress: shippingAddressFinal,
                shippingCharge: shippingCharge,
                additionalCharge: additionalCharge,
                salePrice: itemData.sellingPrice,
                usdPrice: itemData.usdPrice ?? null,
                discountAmount: itemData.discount,
                netAmount: itemData.netAmount,
                costPriceSnapshot: itemData.cost,
                profit: itemData.profit,
                paymentMethod: data.paymentMode,
                paymentStatus: invoicePaymentStatus,
                notes: data.remarks,
                invoiceId: newInvoice.id
              } as Prisma.SaleUncheckedCreateInput;

              await tx.sale.create({
                data: saleData
              });

              await tx.inventory.update({
                  where: { id: itemData.inv.id },
                  data: { status: "SOLD" }
              });
          }

          // Apply existing credit notes of customer (auto-adjust receivable)
          const customerIdForCN = customerProfile?.id || undefined;
          if (customerIdForCN) {
            await applyCreditNotesOnInvoiceCreation({
              tx,
              invoiceId: newInvoice.id,
              customerId: customerIdForCN,
              actorId: session.user.id
            });
          }

          for (const payment of allPayments) {
            if (payment.method === "CREDIT_NOTE") {
              const cnCode = String(payment.reference || "").trim();
              if (!cnCode) throw new Error("Credit note code is required");

              const rows = await tx.$queryRawUnsafe<
                Array<{
                  id: string;
                  customerId: string | null;
                  balanceAmount: number;
                  isActive: number;
                  issueDate: string;
                  activeUntil: string | null;
                  cnCustomerName: string | null;
                }>
              >(
                `SELECT cn.id,
                        cn.customerId,
                        cn.balanceAmount,
                        cn.isActive,
                        cn.issueDate,
                        cn.activeUntil,
                        (SELECT COALESCE(c.name, s.customerName, q.customerName)
                         FROM Invoice i
                         LEFT JOIN Customer c ON c.id = cn.customerId
                         LEFT JOIN Sale s ON s.invoiceId = i.id
                         LEFT JOIN Quotation q ON q.id = i.quotationId
                         WHERE i.id = cn.invoiceId
                         LIMIT 1) as cnCustomerName
                 FROM CreditNote cn
                 WHERE cn.creditNoteNumber = ?
                 LIMIT 1`,
                cnCode
              );
              const cn = rows[0];
              if (!cn) throw new Error("Credit note not found");
              const invoiceCustomerId = customerProfile?.id || null;
              const crossCustomer = Boolean(cn.customerId && invoiceCustomerId && cn.customerId !== invoiceCustomerId);
              if (Number(cn.isActive || 0) !== 1) throw new Error("Credit note is inactive");
              const valid = await tx.$queryRawUnsafe<Array<{ ok: number }>>(
                `SELECT CASE WHEN COALESCE(activeUntil, datetime(issueDate, '+90 day')) >= CURRENT_TIMESTAMP THEN 1 ELSE 0 END as ok
                 FROM CreditNote
                 WHERE id = ?
                 LIMIT 1`,
                cn.id
              );
              if (!valid[0]?.ok) throw new Error("Credit note is expired");
              if (Number(cn.balanceAmount || 0) + 0.009 < Number(payment.amount || 0)) throw new Error("Insufficient credit note balance");

              await tx.$executeRawUnsafe(`UPDATE CreditNote SET balanceAmount = balanceAmount - ? WHERE id = ?`, payment.amount, cn.id);
              await tx.activityLog.create({
                data: {
                  entityType: "CreditNote",
                  entityId: cn.id,
                  entityIdentifier: cnCode,
                  actionType: "APPLY",
                  source: "WEB",
                  userId: session.user.id,
                  userName: session.user.name || session.user.email || "Unknown",
                  details: `Applied ${Number(payment.amount || 0).toFixed(2)} on invoice ${invoiceNumber}${crossCustomer ? " (cross-customer)" : ""}`,
                },
              });
            }
            await tx.payment.create({
              data: {
                invoiceId: newInvoice.id,
                amount: payment.amount,
                method: payment.method,
                date: payment.date,
                reference: payment.reference,
                notes: payment.method === "CREDIT_NOTE" ? [payment.notes, "CN applied by code"].filter(Boolean).join(" | ") : payment.notes,
                recordedBy: session.user.id
              }
            });
          }

          // 3. Update Quotation Status if linked and handle other quotations with same item
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
                      inventoryId: { in: itemIds },
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
                      inventoryId: { in: itemIds },
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

          // 4. Accounting Entry (Double Entry)
          try {
              const prismaTx = tx as PrismaTx;
              const acAR = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, prismaTx);
              const acSales = await getOrCreateAccountByCode(ACCOUNTS.INCOME.SALES, prismaTx);
              
              await postJournalEntry({
                  date: new Date(),
                  description: `Invoice #${invoiceNumber} - ${data.customerName || "Walk-in"}`,
                  referenceType: "INVOICE",
                  referenceId: newInvoice.id,
                  userId: session.user.id,
                  lines: [
                      { accountId: acAR.id, debit: adjustedInvoiceTotal },
                      { accountId: acSales.id, credit: adjustedInvoiceTotal }
                  ]
              }, prismaTx);
          } catch (accError) {
              console.error("Accounting Entry Failed:", accError);
              throw accError; // Ensure data consistency
          }

          // Accrue loyalty points if customer exists and invoice is paid
          if (customerProfile?.id && invoicePaymentStatus === "PAID") {
            try {
              await accrueLoyaltyPoints({
                tx: tx as PrismaTx,
                customerId: customerProfile.id,
                invoiceId: newInvoice.id,
                invoiceNumber: newInvoice.invoiceNumber,
                invoiceTotal: adjustedInvoiceTotal,
                invoiceDate: newInvoice.invoiceDate ?? new Date()
              });
            } catch (loyaltyError) {
              console.error("Loyalty accrual failed:", loyaltyError);
              // Don't fail the sale, just log the error
            }
          }
      });

      for (const itemData of computedItems) {
          await logActivity({
              entityType: "Sale",
              entityId: itemData.inv.id,
              entityIdentifier: itemData.inv.sku,
              actionType: "CREATE",
              source: "WEB",
              userId: session.user.id,
              userName: session.user.name || session.user.email || "Unknown",
              newData: data
          });
      }

  } catch (e) {
      console.error("Create Sale Error:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to create sale";
      return { message: errorMessage };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  // redirect("/sales");
  return { 
    success: true, 
    message: "Sale created successfully. Invoice Generated.",
    invoiceId: createdInvoiceId,
    invoiceNumber: createdInvoiceNumber
  };
}

export async function deleteSale(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const perm = await checkPermission(PERMISSIONS.SALES_DELETE);
  if (!perm.success) return { message: perm.message };

  await ensureInvoiceSupportSchema();

  const [
    hasFollowUp,
    hasPayment,
    hasInvoiceVersion,
    hasCreditNote,
    hasSalesReturn,
    hasSalesReturnItem,
    hasCustomerAdvanceAdjustment,
    hasLoyaltyLedger,
    hasCouponRedemption,
  ] = await Promise.all([
    hasTable("FollowUp"),
    hasTable("Payment"),
    hasTable("InvoiceVersion"),
    hasTable("CreditNote"),
    hasTable("SalesReturn"),
    hasTable("SalesReturnItem"),
    hasTable("CustomerAdvanceAdjustment"),
    hasTable("LoyaltyLedger"),
    hasTable("CouponRedemption"),
  ]);

  const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
          inventory: true
      }
  });

  if (!sale) return { message: "Sale not found" };

  try {
      await prisma.$transaction(async (tx) => {
          if (sale.platform === "REPLACEMENT") {
              // Delete any MemoItem for this inventory that is WITH_CLIENT (from the replacement dispatch)
              await tx.memoItem.deleteMany({
                  where: {
                      inventoryId: sale.inventoryId,
                      status: "WITH_CLIENT"
                  }
              });
          }

          await tx.inventory.update({
            where: { id: sale.inventoryId },
            data: { status: "IN_STOCK" }
          });

          // Delete advance adjustments linked to this sale before deleting the sale
          if (hasCustomerAdvanceAdjustment) {
            await tx.customerAdvanceAdjustment.deleteMany({ where: { saleId: id } });
          }

          await tx.sale.delete({ where: { id } });

          if (sale.invoiceId) {
            const otherSales = await tx.sale.count({ where: { invoiceId: sale.invoiceId, id: { not: id } } });
            if (otherSales === 0) {
              const inv = await tx.invoice.findUnique({
                where: { id: sale.invoiceId },
                select: { id: true, quotationId: true }
              });

              if (hasCreditNote) {
                await tx.creditNote.deleteMany({ where: { invoiceId: sale.invoiceId } });
              }

              if (hasSalesReturn) {
                const returns = await tx.salesReturn.findMany({
                  where: { invoiceId: sale.invoiceId },
                  select: { id: true }
                });
                if (returns.length) {
                  if (hasSalesReturnItem) {
                    await tx.salesReturnItem.deleteMany({
                      where: { salesReturnId: { in: returns.map((r) => r.id) } }
                    });
                  }
                  await tx.salesReturn.deleteMany({ where: { invoiceId: sale.invoiceId } });
                }
              }

              if (hasFollowUp) await tx.followUp.deleteMany({ where: { invoiceId: sale.invoiceId } });
              if (hasPayment) await tx.payment.deleteMany({ where: { invoiceId: sale.invoiceId } });
              if (hasInvoiceVersion) await tx.invoiceVersion.deleteMany({ where: { invoiceId: sale.invoiceId } });

              // Delete loyalty ledger and coupon redemption entries linked to invoice
              if (hasLoyaltyLedger) {
                await tx.$executeRawUnsafe(`DELETE FROM "LoyaltyLedger" WHERE invoiceId = ?`, sale.invoiceId);
              }
              if (hasCouponRedemption) {
                await tx.$executeRawUnsafe(`DELETE FROM "CouponRedemption" WHERE invoiceId = ?`, sale.invoiceId);
              }

              // Delete any remaining sale items on this invoice before deleting the invoice
              await tx.sale.deleteMany({ where: { invoiceId: sale.invoiceId } });

              await tx.invoice.delete({ where: { id: sale.invoiceId } });

              if (inv?.quotationId) {
                const stillHasInvoice = await tx.invoice.count({ where: { quotationId: inv.quotationId } });
                if (stillHasInvoice === 0) {
                  await tx.quotation.update({
                    where: { id: inv.quotationId },
                    data: { status: "ACTIVE" }
                  });
                }
              } else {
                const candidates = await tx.quotation.findMany({
                  where: {
                    status: "CONVERTED",
                    items: { some: { inventoryId: sale.inventoryId } },
                    ...(sale.customerId
                      ? { customerId: sale.customerId }
                      : sale.customerName
                      ? { customerName: sale.customerName }
                      : {}),
                  },
                  select: { id: true, items: { select: { inventoryId: true } } },
                });
                for (const q of candidates) {
                  const ids = q.items.map((i) => i.inventoryId).filter(Boolean);
                  if (!ids.length) continue;
                  const invItems = await tx.inventory.findMany({
                    where: { id: { in: ids } },
                    select: { status: true },
                  });
                  const hasSold = invItems.some((it) => it.status === "SOLD");
                  if (!hasSold) {
                    await tx.quotation.update({ where: { id: q.id }, data: { status: "ACTIVE" } });
                  }
                }
              }
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

  } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("deleteSale error:", msg);
      return { message: msg.includes("FOREIGN KEY constraint failed") ? "Failed to delete sale due to linked records. Please remove linked payments/credit notes/returns first." : msg || "Failed to delete sale" };
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
        if (displayOptions.showWeight) {
            const unit = item.inventory.weightUnit || "cts";
            const label = unit.toLowerCase().includes("ct") ? "Carat" : "Weight";
            details.push(`${label}: ${item.inventory.weightValue} ${unit}`);
        }
        if (displayOptions.showRatti && item.inventory.weightRatti) details.push(`Ratti: ${item.inventory.weightRatti}`);
        if (displayOptions.showPrice) {
            const rateValue = item.inventory.pricingMode === "PER_CARAT"
              ? item.inventory.sellingRatePerCarat
              : item.inventory.flatSellingPrice;
            const rateFallback = rateValue ?? basePrice ?? 0;
            details.push(`Rate: Rs. ${Number(rateFallback || 0).toFixed(2)}`);
        }
        
        if (details.length > 0) descriptionParts.push(details.join(" | "));

        const qtyLabel = item.inventory.weightRatti
            ? `${item.inventory.weightRatti} Ratti`
            : item.inventory.weightValue
            ? `${item.inventory.weightValue} ${item.inventory.weightUnit}`
            : "1";
        return {
            sku: displayOptions.showSku ? item.inventory.sku : "",
            description: descriptionParts.join("\n"),
            quantity: 1,
            displayQty: qtyLabel,
            unitPrice: item.salePrice, // Note: using salePrice here but might need basePrice depending on calculation
            usdPrice: item.usdPrice, // USD price for export invoices
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
    const saleMeta = sale as {
        shippingCharge?: number | null;
        additionalCharge?: number | null;
        billingAddress?: string | null;
        shippingAddress?: string | null;
        placeOfSupply?: string | null;
        customerAddress?: string | null;
        customerCity?: string | null;
    };
    const shippingCharge = saleMeta.shippingCharge || 0;
    const additionalCharge = saleMeta.additionalCharge || 0;
    const total = processedItems.reduce((sum, item) => sum + item.total, 0) + shippingCharge + additionalCharge;

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
    const customerAddress = saleMeta.customerAddress || saleMeta.customerCity || invoice.quotation?.customer?.address || invoice.quotation?.customer?.city || "";
    const billingAddress = saleMeta.billingAddress || saleMeta.customerAddress || customerAddress;
    const shippingAddress = saleMeta.shippingAddress || billingAddress;
    const placeOfSupply = saleMeta.placeOfSupply || saleMeta.customerCity || billingAddress || "-";
    const customerPhone = sale.customerPhone || invoice.quotation?.customer?.phone || "";
    const customerEmail = sale.customerEmail || invoice.quotation?.customer?.email || "";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://khyatigems.com";
    const publicUrl = invoice.token ? `${baseUrl}/invoice/${invoice.token}` : undefined;

    return {
        invoiceNumber: invoice.invoiceNumber,
        date: getInvoiceDisplayDate(invoice),
        publicUrl,
        token: invoice.token,
        company: {
            name: companySettings?.companyName || "KhyatiGems",
            address: companySettings?.address || "",
            email: companySettings?.email || "",
            phone: companySettings?.phone || "",
            website: companySettings?.website || "",
            gstin: companySettings?.gstin || undefined,
            logoUrl: companySettings?.invoiceLogoUrl || companySettings?.logoUrl || undefined,
        },
        customer: {
            name: customerName,
            address: customerAddress,
            phone: customerPhone,
            email: customerEmail,
        },
        billingAddress,
        shippingAddress,
        placeOfSupply,
        items: processedItems.map(item => ({
            sku: item.sku,
            description: item.description,
            quantity: 1,
            displayQty: item.displayQty,
            unitPrice: item.basePrice,
            basePrice: item.basePrice,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,
            total: item.total
        })),
        subtotal: subtotalBase,
        discount,
        tax: totalGst,
        shippingCharge,
        additionalCharge,
        total,
        amountPaid: amountReceived,
        balanceDue,
        status: isPaid ? "PAID" : "DUE",
        paymentStatus,
        paymentMethod: sale.paymentMethod || undefined,
        paidAt: sale.saleDate || undefined,
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
