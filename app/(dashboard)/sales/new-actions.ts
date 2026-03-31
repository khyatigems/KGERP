"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { normalizeDateToUtcNoon } from "@/lib/utils";
import crypto from "crypto";

export async function createNewCustomer(customerData: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_MANAGE)) {
    return { success: false, message: "Insufficient permissions" };
  }

  try {
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          customerData.phone ? { phone: customerData.phone } : {},
          customerData.email ? { email: customerData.email } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });

    if (existingCustomer) {
      return { success: false, message: "Customer already exists" };
    }

    // Create new customer
    const newCustomer = await prisma.customer.create({
      data: {
        name: customerData.name,
        phone: customerData.phone || null,
        email: customerData.email || null,
        address: customerData.address || null,
        city: customerData.city || null,
        state: customerData.state || null,
        pincode: customerData.pincode || null,
      },
    });

    // Generate customer code
    await ensureCustomerCode(newCustomer.id);

    return { 
      success: true, 
      message: "Customer created successfully",
      customer: newCustomer 
    };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, message: "Failed to create customer" };
  }
}

export async function validateCouponCode(code: string, totalAmount: number, customerId?: string) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };

  try {
    const couponRows = await prisma.$queryRawUnsafe<Array<{
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
      code.toUpperCase()
    );

    const coupon = couponRows?.[0];
    if (!coupon || Number(coupon.isActive || 0) !== 1) {
      return { success: false, message: "Invalid or inactive coupon code" };
    }

    const nowTs = Date.now();
    if (coupon.validFrom && new Date(coupon.validFrom).getTime() > nowTs) {
      return { success: false, message: "Coupon is not active yet" };
    }
    if (coupon.validTo && new Date(coupon.validTo).getTime() < nowTs) {
      return { success: false, message: "Coupon expired" };
    }
    if (coupon.minInvoiceAmount != null && totalAmount + 0.009 < Number(coupon.minInvoiceAmount || 0)) {
      return { success: false, message: `Invoice amount below coupon minimum (₹${coupon.minInvoiceAmount})` };
    }

    // Check customer scope
    const scope = String(coupon.applicableScope || "all");
    if (scope.startsWith("customer:")) {
      const targetCustomerId = scope.split(":")[1] || "";
      if (!customerId || customerId !== targetCustomerId) {
        return { success: false, message: "Coupon not allowed for selected customer" };
      }
    }

    // Check usage limits
    const totalUseRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ?`,
      coupon.id
    );
    const totalUses = Number(totalUseRows?.[0]?.cnt || 0);
    if (coupon.usageLimitTotal != null && totalUses >= Number(coupon.usageLimitTotal)) {
      return { success: false, message: "Coupon usage limit exceeded" };
    }

    if (customerId) {
      const custUseRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ? AND customerId = ?`,
        coupon.id, customerId
      );
      const customerUses = Number(custUseRows?.[0]?.cnt || 0);
      if (coupon.usageLimitPerCustomer != null && customerUses >= Number(coupon.usageLimitPerCustomer)) {
        return { success: false, message: "Coupon per-customer usage limit reached" };
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "PERCENT") {
      discountAmount = (totalAmount * Number(coupon.value || 0)) / 100;
    } else {
      discountAmount = Number(coupon.value || 0);
    }

    // Apply max discount limit
    if (coupon.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }

    discountAmount = Math.max(0, Math.min(discountAmount, totalAmount));

    return {
      success: true,
      message: "Coupon validated successfully",
      discount: discountAmount,
      couponId: coupon.id,
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return { success: false, message: "Failed to validate coupon" };
  }
}

export async function getCustomerLoyaltyPoints(customerId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };

  try {
    const loyaltyRows = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
      `SELECT ROUND(COALESCE(SUM(points),0)) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
      customerId
    );
    
    const loyaltyPoints = Number(loyaltyRows?.[0]?.points || 0);
    
    return {
      success: true,
      points: loyaltyPoints,
    };
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    return { success: false, message: "Failed to fetch loyalty points" };
  }
}

export async function createSaleWithNewLogic(saleData: {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  items: Array<{
    inventoryId: string;
    quantity: number;
    discount: number;
    taxAmount: number;
    netAmount: number;
  }>;
  discountType: "none" | "flat" | "coupon";
  flatDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyRedeemAmount?: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingCharge: number;
  additionalCharge: number;
  notes?: string;
  saleDate: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) {
    return { success: false, message: "Insufficient permissions" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get or create customer
      let customerProfile;
      if (saleData.customerId) {
        customerProfile = await tx.customer.findUnique({
          where: { id: saleData.customerId },
        });
        if (!customerProfile) {
          throw new Error("Customer not found");
        }
      } else {
        // Create new customer
        customerProfile = await ensureCustomerCode(
          saleData.customerName,
          tx
        );
      }

      // Calculate totals
      const totalNetAmount = saleData.items.reduce(
        (sum, item) => sum + item.netAmount,
        0
      );
      const totalDiscount = saleData.items.reduce(
        (sum, item) => sum + (item.discount || 0),
        0
      );
      
      // Calculate discount amount from coupon or flat discount
      let discountAmount = 0;
      if (saleData.discountType === "flat" && saleData.flatDiscount) {
        discountAmount = saleData.flatDiscount;
      } else if (saleData.discountType === "coupon" && saleData.couponDiscount) {
        discountAmount = saleData.couponDiscount;
      }
      
      const adjustedInvoiceTotal = Math.max(0, totalNetAmount - discountAmount);
      const loyaltyRedeemAmount = Math.min(saleData.loyaltyRedeemAmount || 0, adjustedInvoiceTotal);
      const finalTotal = Math.max(0, adjustedInvoiceTotal - loyaltyRedeemAmount);

      // Generate invoice number using your existing ERP system
      const invoiceNumber = await generateInvoiceNumber(tx);

      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          token: crypto.randomUUID(),
          isActive: true,
          invoiceDate: normalizeDateToUtcNoon(new Date(saleData.saleDate)),
          subtotal: totalNetAmount,
          taxTotal: saleData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0),
          discountTotal: totalDiscount + discountAmount,
          totalAmount: finalTotal,
          paymentStatus: saleData.paymentStatus as any,
          paidAmount: (saleData as any).paidAmount || 0,
          status: saleData.paymentStatus === "PAID" ? "PAID" : "ISSUED",
        },
      });

      // Create main sale record
      const newSale = await tx.sale.create({
        data: {
          invoiceId: newInvoice.id,
          customerId: customerProfile.id,
          customerName: customerProfile.name,
          customerEmail: customerProfile.email || undefined,
          customerPhone: customerProfile.phone || undefined,
          netAmount: finalTotal,
          saleDate: normalizeDateToUtcNoon(new Date(saleData.saleDate)),
          notes: saleData.notes || null,
          paymentStatus: saleData.paymentStatus as any,
          paymentMethod: saleData.paymentMethod as any,
          platform: "MANUAL",
          // Use first item for main record
          inventoryId: saleData.items[0]?.inventoryId || "",
          salePrice: finalTotal,
        },
      });

      // Create sale items as separate sale records
      for (const item of saleData.items) {
        await tx.sale.create({
          data: {
            invoiceId: newInvoice.id,
            customerId: customerProfile.id,
            customerName: customerProfile.name,
            customerEmail: customerProfile.email || undefined,
            customerPhone: customerProfile.phone || undefined,
            inventoryId: item.inventoryId,
            salePrice: item.netAmount / item.quantity,
            taxAmount: item.taxAmount || 0,
            discountAmount: item.discount || 0,
            netAmount: item.netAmount,
            saleDate: normalizeDateToUtcNoon(new Date(saleData.saleDate)),
            paymentStatus: saleData.paymentStatus,
            paymentMethod: saleData.paymentMethod,
            platform: "MANUAL",
            notes: saleData.notes || null,
          },
        });
      }

      // Create payment record if payment made
      if (saleData.paymentStatus === "PAID" || saleData.paymentStatus === "PARTIAL") {
        const paymentAmount = saleData.paymentStatus === "PAID" 
          ? finalTotal 
          : ((saleData as any).paidAmount || 0);
          
        await tx.payment.create({
          data: {
            invoiceId: newInvoice.id,
            amount: paymentAmount,
            method: saleData.paymentMethod as any,
            date: normalizeDateToUtcNoon(new Date(saleData.saleDate)),
            notes: `Payment for invoice ${invoiceNumber}`,
          },
        });
      }

      // Update customer loyalty points if redeemed
      if (loyaltyRedeemAmount > 0 && customerProfile) {
        const currentPoints = await getCustomerLoyaltyPoints(customerProfile.id);
        if (currentPoints && currentPoints.points) {
          const pointsToRedeem = Math.min(
            loyaltyRedeemAmount,
            currentPoints.points
          );
          // TODO: Implement updateCustomerLoyaltyPoints function
          // await updateCustomerLoyaltyPoints(
          //   customerProfile.id,
          //   currentPoints.points - pointsToRedeem,
          //   tx
          // );
        }
      }

      // Update inventory status
      for (const item of saleData.items) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: {
            status: "SOLD",
          },
        });
      }

      return {
        success: true,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        saleId: newSale.id,
        customerId: customerProfile.id,
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating sale:", error);
    return { success: false, message: "Failed to create sale" };
  }
}

// Helper functions
async function ensureCustomerCode(customerId: string, tx: any = prisma) {
  try {
    const existingCode = await tx.$queryRawUnsafe(
      `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
      customerId
    );

    if (existingCode && existingCode.length > 0) {
      return existingCode[0].code;
    }

    const year2 = String(new Date().getFullYear()).slice(-2);
    let code = "";
    for (let i = 0; i < 20; i++) {
      const rnd = Math.floor(Math.random() * 1000000);
      const candidate = `C${year2}-${String(rnd).padStart(6, "0")}`;
      const collision = await tx.$queryRawUnsafe(
        `SELECT code FROM CustomerCode WHERE code = ? LIMIT 1`,
        candidate
      );
      if (!collision.length) {
        code = candidate;
        break;
      }
    }

    if (code) {
      await tx.$queryRawUnsafe(
        `INSERT INTO CustomerCode (id, customerId, code, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        crypto.randomUUID(),
        customerId,
        code
      );
    }

    return code;
  } catch (error) {
    console.error("Error ensuring customer code:", error);
    return null;
  }
}

async function generateInvoiceNumber(tx: any) {
  try {
    const prefix = "INV";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    
    // Get the latest invoice number for this month
    const latestInvoice = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `${prefix}-${year}-${month}`,
        },
      },
      orderBy: {
        invoiceNumber: "desc",
      },
    });

    let sequence = 1;
    if (latestInvoice) {
      const parts = latestInvoice.invoiceNumber.split("-");
      if (parts.length >= 4) {
        sequence = parseInt(parts[3]) + 1;
      }
    }

    return `${prefix}-${year}-${month}-${String(sequence).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `INV-${Date.now()}`;
  }
}
