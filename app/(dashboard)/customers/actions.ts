"use server";

import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";

const normalizePhone = (input: unknown) => {
  if (typeof input !== "string") return "";
  return input.replace(/[^\d+]/g, "");
};

async function linkLegacyCustomerRecords(
  tx: any,
  input: { customerId: string; phone: string | null; email: string | null }
) {
  const phone = input.phone ? input.phone.replace(/[^\d+]/g, "") : null;
  const email = input.email ? input.email.trim().toLowerCase() : null;

  if (phone) {
    const phoneDigits = phone.replace(/[^\d]/g, "");
    await tx.$executeRawUnsafe(
      `
      UPDATE "Sale"
      SET "customerId" = ?
      WHERE "customerId" IS NULL
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE("customerPhone", ''), char(96), ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') = ?
      `,
      input.customerId,
      phoneDigits
    );
    await tx.$executeRawUnsafe(
      `
      UPDATE "Quotation"
      SET "customerId" = ?
      WHERE "customerId" IS NULL
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE("customerMobile", ''), char(96), ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') = ?
      `,
      input.customerId,
      phoneDigits
    );
  }

  if (email) {
    await tx.sale.updateMany({
      where: { customerId: null, customerEmail: email },
      data: { customerId: input.customerId },
    });
    await tx.quotation.updateMany({
      where: { customerId: null, customerEmail: email },
      data: { customerId: input.customerId },
    });
  }
}

const phoneSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => {
    if (!val) return true;
    const digits = val.replace(/[^\d]/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Invalid phone number");

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: phoneSchema,
  phoneSecondary: phoneSchema,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional().or(z.literal("")).refine((v) => {
    if (!v) return true;
    return /^[0-9A-Za-z-]{4,10}$/.test(v);
  }, "Invalid pincode"),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
  customerType: z.string().optional(),
  assignedSalesperson: z.string().optional(),
  interestedIn: z.string().optional(),
  budgetRange: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredContact: z.string().optional(),
});

export async function createCustomer(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session?.user) return { message: "Unauthorized" };

  await ensureCustomerSecondaryPhoneSchema();
  await ensureReturnsSchema();

  const raw = Object.fromEntries(formData.entries());
  const parsed = customerSchema.safeParse({
    ...raw,
    phone: typeof raw.phone === "string" ? normalizePhone(raw.phone) : raw.phone,
    phoneSecondary: typeof raw.phoneSecondary === "string" ? normalizePhone(raw.phoneSecondary) : raw.phoneSecondary,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.phone) {
        const dup = await tx.customer.findFirst({
          where: { phone: parsed.data.phone },
          select: { id: true },
        });
        if (dup) {
          throw new Error("A customer with this mobile already exists. Please search and edit the existing record.");
        }
      }

      const c = await tx.customer.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          phoneSecondary: parsed.data.phoneSecondary || null,
          address: parsed.data.address || null,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
          country: parsed.data.country || null,
          pincode: parsed.data.pincode || null,
          pan: parsed.data.pan || null,
          gstin: parsed.data.gstin || null,
          notes: parsed.data.notes || null,
          customerType: parsed.data.customerType || "Retail",
          assignedSalesperson: parsed.data.assignedSalesperson || null,
          interestedIn: parsed.data.interestedIn || null,
          budgetRange: parsed.data.budgetRange || null,
          whatsappNumber: parsed.data.whatsappNumber || null,
          preferredContact: parsed.data.preferredContact || null,
        } as unknown as never,
      });

      const year2 = String(new Date().getFullYear()).slice(-2);
      let code = "";
      for (let i = 0; i < 20; i++) {
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
          c.id,
          code
        );
      }

      await linkLegacyCustomerRecords(tx, {
        customerId: c.id,
        phone: parsed.data.phone || null,
        email: parsed.data.email ? parsed.data.email.trim().toLowerCase() : null,
      });
      return c;
    });

    await logActivity({
      entityType: "Customer",
      entityId: created.id,
      entityIdentifier: created.name,
      actionType: "CREATE",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      newData: parsed.data as unknown as Record<string, unknown>,
    });

    revalidatePath("/customers");
    return { success: true, customerId: created.id };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Failed to create customer" };
  }
}

export async function updateCustomer(id: string, prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session?.user) return { message: "Unauthorized" };

  await ensureCustomerSecondaryPhoneSchema();
  await ensureReturnsSchema();

  const raw = Object.fromEntries(formData.entries());
  const parsed = customerSchema.safeParse({
    ...raw,
    phone: typeof raw.phone === "string" ? normalizePhone(raw.phone) : raw.phone,
    phoneSecondary: typeof raw.phoneSecondary === "string" ? normalizePhone(raw.phoneSecondary) : raw.phoneSecondary,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return { message: "Customer not found" };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.phone) {
        const dup = await tx.customer.findFirst({
          where: { phone: parsed.data.phone, id: { not: id } },
          select: { id: true },
        });
        if (dup) {
          throw new Error("A customer with this mobile already exists. Please search and edit the existing record.");
        }
      }

      await tx.customer.update({
        where: { id },
        data: {
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          phoneSecondary: parsed.data.phoneSecondary || null,
          address: parsed.data.address || null,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
          country: parsed.data.country || null,
          pincode: parsed.data.pincode || null,
          pan: parsed.data.pan || null,
          gstin: parsed.data.gstin || null,
          notes: parsed.data.notes || null,
          customerType: parsed.data.customerType || "Retail",
          assignedSalesperson: parsed.data.assignedSalesperson || null,
          interestedIn: parsed.data.interestedIn || null,
          budgetRange: parsed.data.budgetRange || null,
          whatsappNumber: parsed.data.whatsappNumber || null,
          preferredContact: parsed.data.preferredContact || null,
        } as unknown as never,
      });

      await linkLegacyCustomerRecords(tx, {
        customerId: id,
        phone: parsed.data.phone || null,
        email: parsed.data.email ? parsed.data.email.trim().toLowerCase() : null,
      });
    });

    await logActivity({
      entityType: "Customer",
      entityId: id,
      entityIdentifier: parsed.data.name,
      actionType: "EDIT",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      oldData: existing as unknown as Record<string, unknown>,
      newData: parsed.data as unknown as Record<string, unknown>,
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Failed to update customer" };
  }
}

export async function getCustomerDeleteImpact(customerId: string) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { success: false, message: perm.message, impact: null as null };

  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized", impact: null as null };

  await ensureReturnsSchema();

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, message: "Customer not found", impact: null as null };

  const [salesCount, quotationCount, invoiceCount, paymentCount] = await Promise.all([
    prisma.sale.count({ where: { customerId } }).catch(() => 0),
    prisma.quotation.count({ where: { customerId } }).catch(() => 0),
    prisma.invoice.count({
      where: {
        OR: [
          { quotation: { customerId } },
          { sales: { some: { customerId } } },
        ],
      },
    }).catch(() => 0),
    prisma.payment.count({
      where: {
        invoice: {
          OR: [
            { quotation: { customerId } },
            { sales: { some: { customerId } } },
          ],
        },
      },
    }).catch(() => 0),
  ]);

  const customerCode = await (async () => {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
        customerId
      );
      return rows[0]?.code || null;
    } catch {
      return null;
    }
  })();

  const creditNotes = await (async () => {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ cnt: number; bal: number }>>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(balanceAmount), 0) as bal FROM CreditNote WHERE customerId = ?`,
        customerId
      );
      return { creditNoteCount: Number(rows[0]?.cnt || 0), creditBalance: Number(rows[0]?.bal || 0) };
    } catch {
      return { creditNoteCount: 0, creditBalance: 0 };
    }
  })();

  return {
    success: true,
    impact: {
      customerId,
      customerName: customer.name,
      customerCode,
      salesCount,
      quotationCount,
      invoiceCount,
      paymentCount,
      creditNoteCount: creditNotes.creditNoteCount,
      creditBalance: creditNotes.creditBalance,
    },
  };
}

export async function deleteCustomer(customerId: string) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };

  const impactRes = await getCustomerDeleteImpact(customerId);
  if (!impactRes.success || !impactRes.impact) return { success: false, message: impactRes.message || "Unable to delete customer" };

  const impact = impactRes.impact;
  const hasHardLinked =
    impact.salesCount > 0 ||
    impact.invoiceCount > 0 ||
    impact.paymentCount > 0 ||
    impact.creditNoteCount > 0 ||
    impact.creditBalance > 0.009;

  if (hasHardLinked) {
    return {
      success: false,
      message:
        "Customer cannot be deleted because linked records exist (sales/invoices/payments/credit notes).",
    };
  }

  await ensureReturnsSchema();
  await prisma.$transaction(async (tx) => {
    if (impact.quotationCount > 0) {
      await tx.quotation.deleteMany({ where: { customerId: customerId } });
    }
    await tx.$executeRawUnsafe(`DELETE FROM CustomerCode WHERE customerId = ?`, customerId);
    await tx.customer.delete({ where: { id: customerId } });
  });

  await logActivity({
    entityType: "Customer",
    entityId: customerId,
    entityIdentifier: impact.customerCode || impact.customerName,
    actionType: "DELETE",
    details: `Deleted customer ${impact.customerName}`,
  });

  revalidatePath("/customers");
  return { success: true };
}

 
