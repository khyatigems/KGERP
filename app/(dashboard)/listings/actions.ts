"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const listingSchema = z.object({
  inventoryId: z.string().uuid("Invalid inventory item"),
  platform: z.string().min(1, "Platform is required"),
  listingUrl: z.string().url().optional().or(z.literal("")),
  listingRef: z.string().optional(),
  listedPrice: z.coerce.number().positive("Listed price must be positive"),
  listedDate: z.coerce.date().optional(),
});

export async function createListing(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.listing.create({
      data: {
        inventoryId: data.inventoryId,
        platform: data.platform,
        listingUrl: data.listingUrl || null,
        listingRef: data.listingRef,
        listedPrice: data.listedPrice,
        listedDate: data.listedDate || new Date(),
        status: "LISTED",
      },
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to create listing" };
  }

  revalidatePath("/listings");
  redirect("/listings");
}

export async function updateListingStatus(
  id: string,
  status: "LISTED" | "SOLD" | "DELISTED"
) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  try {
    await prisma.listing.update({
      where: { id },
      data: { status },
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to update listing status" };
  }

  revalidatePath("/listings");
}

