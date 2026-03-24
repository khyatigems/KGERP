"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";

const normalizePhone = (input: unknown) => {
  if (typeof input !== "string") return "";
  return input.replace(/[^\d+]/g, "");
};

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
});

export async function createCustomer(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session?.user) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = customerSchema.safeParse({
    ...raw,
    phone: typeof raw.phone === "string" ? normalizePhone(raw.phone) : raw.phone,
    phoneSecondary: typeof raw.phoneSecondary === "string" ? normalizePhone(raw.phoneSecondary) : raw.phoneSecondary,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    const created = await prisma.customer.create({
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
      } as unknown as never,
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
    await prisma.customer.update({
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
      } as unknown as never,
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

export async function deleteCustomer(id: string) {
  const perm = await checkPermission(PERMISSIONS.CUSTOMER_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session?.user) return { message: "Unauthorized" };

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return { message: "Customer not found" };

  const linked = await prisma.sale.findFirst({ where: { customerId: id }, select: { id: true } });
  const linkedQuote = await prisma.quotation.findFirst({ where: { customerId: id }, select: { id: true } });
  if (linked || linkedQuote) {
    return { message: "Cannot delete customer linked to sales/quotations" };
  }

  try {
    await prisma.customer.delete({ where: { id } });

    await logActivity({
      entityType: "Customer",
      entityId: id,
      entityIdentifier: existing.name,
      actionType: "DELETE",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      oldData: existing as unknown as Record<string, unknown>,
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Failed to delete customer" };
  }
}
