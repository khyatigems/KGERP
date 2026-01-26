"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";
import { expenseSchema, type ExpenseFormValues } from "./schema";

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

  const expense = await prisma.expense.create({
    data: {
      ...rest,
      categoryId,
      createdById: session.user.id,
    },
    include: { category: true }
  });

  await logActivity({
    entityType: "Expense",
    entityId: expense.id,
    entityIdentifier: expense.description,
    actionType: "CREATE",
    details: `Created expense: ${expense.description} (${expense.totalAmount})`,
    userId: session.user.id,
  });

  revalidatePath("/expenses");
  return { success: true as const, expense };
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

  const expense = await prisma.expense.update({
    where: { id },
    data: {
        ...data,
    },
    include: { category: true }
  });

  await logActivity({
    entityType: "Expense",
    entityId: expense.id,
    entityIdentifier: expense.description,
    actionType: "EDIT",
    oldData: existing,
    newData: expense,
    userId: session.user.id,
  });

  revalidatePath("/expenses");
  return { success: true as const, expense };
}

export async function deleteExpense(id: string) {
  await checkPermission(PERMISSIONS.EXPENSE_DELETE);
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new Error("Expense not found");

  await prisma.expense.delete({
    where: { id },
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

    return await prisma.expense.findMany({
        where,
        include: {
            category: true,
            createdBy: {
                select: { name: true }
            }
        },
        orderBy: { expenseDate: "desc" }
    });
}

export async function importExpensesFromCSV(data: any[]) {
    await checkPermission(PERMISSIONS.EXPENSE_CREATE);
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const categories = await prisma.expenseCategory.findMany();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    let successCount = 0;
    let errors: string[] = [];

    for (const [index, row] of data.entries()) {
        const rowNum = index + 1;
        try {
            // Mapping Logic
            // expenseDate,category,description,vendorName,baseAmount,gstApplicable,gstRate,paymentMode,paymentStatus,paidAmount,referenceNo
            
            const catName = row.category?.trim().toLowerCase();
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
                baseAmount: Number(row.baseAmount),
                gstApplicable: String(row.gstApplicable).toLowerCase() === 'true',
                gstRate: row.gstRate ? Number(row.gstRate) : 0,
                paymentMode: row.paymentMode,
                paymentStatus: row.paymentStatus || "PAID",
                paidAmount: row.paidAmount ? Number(row.paidAmount) : 0,
                referenceNo: row.referenceNo,
                // Calculate totals
                totalAmount: 0, 
                gstAmount: 0,
                // Optional fields
                paymentDate: row.paymentDate ? new Date(row.paymentDate) : undefined,
                paymentRef: row.paymentRef,
                attachmentUrl: row.attachmentUrl
            };

            // Calculate totals logic
            let total = expenseData.baseAmount;
            if (expenseData.gstApplicable && expenseData.gstRate) {
                const gst = (total * expenseData.gstRate) / 100;
                expenseData.gstAmount = gst;
                total += gst;
            }
            expenseData.totalAmount = total;

            const validation = expenseSchema.safeParse(expenseData);
            if (!validation.success) {
                 errors.push(`Row ${rowNum}: ${JSON.stringify(validation.error.format())}`);
                 continue;
            }

            await prisma.expense.create({
                data: {
                    ...validation.data,
                    createdById: session.user.id
                }
            });
            successCount++;

        } catch (e) {
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
    }

    return { success: true, count: successCount, errors };
}
