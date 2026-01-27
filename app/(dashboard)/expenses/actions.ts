"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";
import { expenseSchema, type ExpenseFormValues } from "./schema";

import { createVoucher } from "@/lib/voucher-service";

export async function createExpense(data: ExpenseFormValues) {
  await checkPermission(PERMISSIONS.EXPENSE_CREATE);
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validation = expenseSchema.safeParse(data);
  if (!validation.success) {
    return { success: false as const, error: validation.error.format() };
  }

  const { categoryId, ...rest } = validation.data;

  // Verify category exists
  const category = await prisma.expenseCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    return { success: false as const, error: "Invalid category" };
  }

  try {
    const expense = await prisma.$transaction(async (tx) => {
      // 1. Create Voucher
      const voucher = await createVoucher({
        type: "EXPENSE",
        date: rest.expenseDate,
        amount: rest.totalAmount,
        narration: rest.description,
        createdById: session.user.id
      }, tx);

      // 2. Create Expense
      const newExpense = await tx.expense.create({
        data: {
          ...rest,
          categoryId,
          createdById: session.user.id,
          voucherId: voucher.id
        },
        include: { category: true }
      });

      // 3. Link Voucher to Expense
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { referenceId: newExpense.id }
      });

      return newExpense;
    });

    await logActivity({
      entityType: "Expense",
      entityId: expense.id,
      entityIdentifier: expense.description,
      actionType: "CREATE",
      details: `Created expense with Voucher linked: ${expense.description} (${expense.totalAmount})`,
      userId: session.user.id,
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting/reports");
    return { success: true as const, expense };
  } catch (error) {
    console.error("Transaction failed:", error);
    return { success: false as const, error: "Failed to create expense transaction" };
  }
}

export async function updateExpense(id: string, data: Partial<ExpenseFormValues>) {
  await checkPermission(PERMISSIONS.EXPENSE_EDIT);
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.expense.findUnique({
      where: { id },
      include: { category: true }
  });

  if (!existing) throw new Error("Expense not found");

  try {
    const expense = await prisma.$transaction(async (tx) => {
      // 1. Reverse old voucher if exists
      if (existing.voucherId) {
        await tx.voucher.update({
          where: { id: existing.voucherId },
          data: { 
            isReversed: true, 
            reversalReason: `Edited by ${session.user.name} on ${new Date().toISOString()}` 
          }
        });
      }

      // 2. Create NEW Voucher
      const voucher = await createVoucher({
        type: "EXPENSE",
        date: data.expenseDate || existing.expenseDate,
        amount: data.totalAmount ?? existing.totalAmount,
        narration: data.description || existing.description,
        createdById: session.user.id
      }, tx);

      // 3. Update Expense to point to new voucher
      const updated = await tx.expense.update({
        where: { id },
        data: {
            ...data,
            voucherId: voucher.id
        },
        include: { category: true }
      });

      // 4. Link Voucher
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { referenceId: updated.id }
      });

      return updated;
    });

    await logActivity({
      entityType: "Expense",
      entityId: expense.id,
      entityIdentifier: expense.description,
      actionType: "EDIT",
      details: "Updated expense and rotated voucher",
      userId: session.user.id,
    });

    revalidatePath("/expenses");
    return { success: true as const, expense };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false as const, error: "Failed to update expense" };
  }
}

export async function deleteExpense(id: string) {
  await checkPermission(PERMISSIONS.EXPENSE_DELETE);
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new Error("Expense not found");

  await prisma.$transaction(async (tx) => {
    // 1. Reverse Voucher
    if (expense.voucherId) {
      await tx.voucher.update({
        where: { id: expense.voucherId },
        data: { 
          isReversed: true, 
          reversalReason: `Expense Deleted by ${session.user.name}` 
        }
      });
    }

    // 2. Delete Expense Record
    await tx.expense.delete({
      where: { id },
    });
  });

  await logActivity({
    entityType: "Expense",
    entityId: expense.id,
    entityIdentifier: expense.description,
    actionType: "DELETE",
    oldData: expense,
    userId: session.user.id,
  });

  revalidatePath("/expenses");
  return { success: true as const };
}

export async function getExpenseCategories() {
  await checkPermission(PERMISSIONS.EXPENSE_VIEW);
  return await prisma.expenseCategory.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

export async function getExpenses(filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: string;
    paymentStatus?: string;
}) {
    await checkPermission(PERMISSIONS.EXPENSE_VIEW);
    
    const where: any = {};
    if (filters?.startDate && filters?.endDate) {
        where.expenseDate = {
            gte: filters.startDate,
            lte: filters.endDate
        };
    }
    if (filters?.categoryId) {
        where.categoryId = filters.categoryId;
    }
    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
        where.paymentStatus = filters.paymentStatus;
    }

    try {
        return await prisma.expense.findMany({
            where,
            // Using include again because explicitly selecting 'voucherId' fails 
            // until the server is restarted.
            // We will accept that this might break momentarily until restart,
            // but 'include' is generally safer if we just avoid selecting the deleted columns.
            include: {
                category: true,
                // createdBy: { select: { name: true } } // COMMENTED OUT: Causing Inconsistent Query Result
            },
            orderBy: { expenseDate: "desc" }
        });
    } catch (error) {
        console.error("Failed to fetch expenses:", error);
        throw error;
    }
}

export interface ExpenseImportRow {
    category?: string;
    expenseDate?: string | Date;
    description: string;
    vendorName: string;
    paymentMode: string;
    paymentStatus?: string;
    paidAmount?: string | number;
    referenceNo?: string;
    totalAmount?: string | number;
    baseAmount?: string | number;
    paymentDate?: string | Date;
    paymentRef?: string;
    attachmentUrl?: string;
}

export async function importExpensesFromCSV(data: ExpenseImportRow[]) {
    await checkPermission(PERMISSIONS.EXPENSE_CREATE);
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const categories = await prisma.expenseCategory.findMany();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    let successCount = 0;
    const errors: string[] = [];

    for (const [index, row] of data.entries()) {
        const rowNum = index + 1;
        try {
            // Mapping Logic
            // expenseDate,category,description,vendorName,baseAmount,gstApplicable,gstRate,paymentMode,paymentStatus,paidAmount,referenceNo
            
            const catName = row.category?.trim().toLowerCase();
            
            if (!catName) {
                 errors.push(`Row ${rowNum}: Category missing`);
                 continue;
            }

            const categoryId = categoryMap.get(catName);
            
            if (!categoryId) {
                errors.push(`Row ${rowNum}: Category '${row.category}' not found`);
                continue;
            }

            // Prepare object for validation
            const expenseData = {
                expenseDate: row.expenseDate ? new Date(row.expenseDate) : new Date(), 
                categoryId: categoryId,
                description: row.description,
                vendorName: row.vendorName,
                // baseAmount: Number(row.baseAmount), // Removed
                // gstApplicable: String(row.gstApplicable).toLowerCase() === 'true', // Removed
                // gstRate: row.gstRate ? Number(row.gstRate) : 0, // Removed
                paymentMode: row.paymentMode,
                paymentStatus: row.paymentStatus || "PAID",
                paidAmount: row.paidAmount ? Number(row.paidAmount) : 0,
                referenceNo: row.referenceNo,
                // Calculate totals
                totalAmount: Number(row.totalAmount || row.baseAmount || 0), 
                // gstAmount: 0, // Removed
                // Optional fields
                paymentDate: row.paymentDate ? new Date(row.paymentDate) : undefined,
                paymentRef: row.paymentRef,
                attachmentUrl: row.attachmentUrl
            };

            // Calculate totals logic (Simplied: just trust totalAmount or baseAmount)
            // let total = expenseData.baseAmount;
            // if (expenseData.gstApplicable && expenseData.gstRate) {
            //    const gst = (total * expenseData.gstRate) / 100;
            //    expenseData.gstAmount = gst;
            //    total += gst;
            // }
            // expenseData.totalAmount = total;

            const validation = expenseSchema.safeParse(expenseData);
            if (!validation.success) {
                 errors.push(`Row ${rowNum}: ${JSON.stringify(validation.error.format())}`);
                 continue;
            }

            await prisma.$transaction(async (tx) => {
                 const voucher = await createVoucher({
                    type: "EXPENSE",
                    date: validation.data.expenseDate,
                    amount: validation.data.totalAmount,
                    narration: validation.data.description,
                    createdById: session.user.id
                 }, tx);

                 const expense = await tx.expense.create({
                    data: {
                        ...validation.data,
                        createdById: session.user.id,
                        voucherId: voucher.id
                    }
                 });

                 await tx.voucher.update({
                    where: { id: voucher.id },
                    data: { referenceId: expense.id }
                 });
            });

            successCount++;

        } catch {
            errors.push(`Row ${rowNum}: Unexpected error`);
        }
    }

    if (successCount > 0) {
        await logActivity({
            entityType: "Expense",
            entityId: "BATCH",
            entityIdentifier: "CSV Import",
            actionType: "CREATE",
            details: `Imported ${successCount} expenses`,
            userId: session.user.id,
            source: "CSV_IMPORT"
        });
        revalidatePath("/expenses");
        revalidatePath("/accounting/reports");
    }

    return { success: true, count: successCount, errors };
}
