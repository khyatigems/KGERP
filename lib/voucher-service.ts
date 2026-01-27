import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client-custom-v2";

export type VoucherType = "EXPENSE" | "PAYMENT" | "REVERSAL" | "RECEIPT";

export async function generateVoucherNumber(type: VoucherType, date: Date, tx: Prisma.TransactionClient | PrismaClient = prisma): Promise<string> {
  const year = date.getFullYear();
  const prefix = type === "EXPENSE" ? "EXP" : type === "PAYMENT" ? "PAY" : type === "RECEIPT" ? "RCT" : "REV";
  
  // Find the last voucher of this type for this year
  // Pattern: PREFIX/YEAR/XXXXXX
  // We use startsWith to find vouchers for this year
  const searchPrefix = `${prefix}/${year}/`;
  
  const lastVoucher = await tx.voucher.findFirst({
    where: {
      voucherNumber: {
        startsWith: searchPrefix
      }
    },
    orderBy: {
      voucherNumber: "desc"
    }
  });

  let nextNum = 1;
  if (lastVoucher) {
    const parts = lastVoucher.voucherNumber.split("/");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}/${year}/${nextNum.toString().padStart(6, "0")}`;
}

export async function createVoucher(data: {
  type: VoucherType;
  date: Date;
  amount: number;
  narration?: string;
  referenceId?: string;
  createdById: string;
}, tx: Prisma.TransactionClient | PrismaClient = prisma) {
  const voucherNumber = await generateVoucherNumber(data.type, data.date, tx);
  
  return await tx.voucher.create({
    data: {
      voucherNumber,
      voucherType: data.type,
      voucherDate: data.date,
      amount: data.amount,
      narration: data.narration,
      referenceId: data.referenceId,
      createdById: data.createdById,
    }
  });
}
