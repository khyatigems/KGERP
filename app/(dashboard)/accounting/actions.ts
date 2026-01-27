"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client-custom-v2";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { createVoucher } from "@/lib/voucher-service";

export type VoucherFilter = {
  startDate?: Date;
  endDate?: Date;
  type?: string; // EXPENSE | PAYMENT | REVERSAL | ALL
  search?: string;
};

export async function getVoucherReport(filters: VoucherFilter) {
  await checkPermission(PERMISSIONS.EXPENSE_VIEW); // Reusing expense permission for now
  
  const where: Prisma.VoucherFindManyArgs['where'] = {};

  // Date Range Filter
  if (filters.startDate && filters.endDate) {
    where.voucherDate = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  }

  // Type Filter
  if (filters.type && filters.type !== "ALL") {
    where.voucherType = filters.type;
  }

  // Search Filter (Number or Narration)
  if (filters.search) {
    where.OR = [
      { voucherNumber: { contains: filters.search } },
      { narration: { contains: filters.search } },
      { 
        expense: {
           OR: [
             { vendorName: { contains: filters.search } },
             { description: { contains: filters.search } }
           ]
        }
      }
    ];
  }

  const vouchers = await prisma.voucher.findMany({
    where,
    include: {
      expense: {
        include: { category: true }
      },
      // createdBy: {
      //   select: { name: true }
      // }
    },
    orderBy: { voucherDate: "desc" }
  });

  // Calculate Totals
  const totalDebits = vouchers
    .filter(v => (v.voucherType === "EXPENSE" || v.voucherType === "PAYMENT") && !v.isReversed)
    .reduce((sum, v) => sum + v.amount, 0);

  const totalCredits = vouchers
    .filter(v => v.voucherType === "RECEIPT" && !v.isReversed)
    .reduce((sum, v) => sum + v.amount, 0);

  const totalReversals = vouchers
    .filter(v => v.isReversed)
    .reduce((sum, v) => sum + v.amount, 0);

  return { vouchers, stats: { totalDebits, totalCredits, totalReversals, count: vouchers.length } };
}

export async function createReceipt(data: {
  date: Date;
  amount: number;
  fromName: string; // Payer
  description: string;
  paymentMode: string;
}) {
  await checkPermission(PERMISSIONS.EXPENSE_CREATE); // Reuse permission or create new one
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const voucher = await prisma.$transaction(async (tx) => {
      // 1. Create Receipt Voucher
      const voucher = await createVoucher({
        type: "RECEIPT",
        date: data.date,
        amount: data.amount,
        narration: `Received from ${data.fromName}: ${data.description}`,
        createdById: session.user.id
      }, tx);

      // We can optionally store extra metadata in narration or referenceId
      // For now, storing operational details in narration is sufficient for a simple Receipt.
      // If we had an 'Income' model, we would link it here.

      return voucher;
    });

    return { success: true, voucher };
  } catch (error) {
    console.error("Failed to create receipt", error);
    return { success: false, error: "Failed to create receipt" };
  }
}

export async function getCompanyDetailsForVoucher() {
  // Try to fetch from CompanySettings
  const company = await prisma.companySettings.findFirst();
  
  if (company) {
      return {
          name: company.companyName,
          address: [company.addressLine1, company.city, company.state, company.pincode].filter(Boolean).join(", "),
          phone: company.phone,
          email: company.email,
          logoUrl: company.logoUrl || company.invoiceLogoUrl
      };
  }

  // Fallback to Setting table (Key-Value)
  const settings = await prisma.setting.findMany({
      where: {
          key: { in: ["company_name", "company_phone", "company_email", "company_address"] }
      }
  });

  const getVal = (k: string) => settings.find(s => s.key === k)?.value || "";

  return {
      name: getVal("company_name") || "Khyati Gems",
      address: getVal("company_address") || "Jaipur, Rajasthan",
      phone: getVal("company_phone"),
      email: getVal("company_email"),
      logoUrl: undefined
  };
}
