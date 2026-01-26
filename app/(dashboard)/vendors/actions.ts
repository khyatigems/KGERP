"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  vendorType: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "BLOCKED"]).optional(),
});

export async function createVendor(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.VENDOR_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = vendorSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.vendor.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        vendorType: data.vendorType,
        notes: data.notes,
        status: data.status || "APPROVED", // Default to APPROVED if not specified
      },
    });
  } catch (e) {
    console.error(e);
    // Check for unique constraint on name
    return { message: "Failed to create vendor. Name might already exist." };
  }

  revalidatePath("/vendors");
  // redirect("/vendors");
  return { success: true, message: "Vendor created successfully" };
}

export async function updateVendor(id: string, prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.VENDOR_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = vendorSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.vendor.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        vendorType: data.vendorType,
        notes: data.notes,
        status: data.status,
      },
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to update vendor" };
  }

  revalidatePath("/vendors");
  // redirect("/vendors");
  return { success: true, message: "Vendor updated successfully" };
}
