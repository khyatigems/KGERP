"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { assertNotFrozen, getGovernanceConfig } from "@/lib/governance";

type PrismaWithListing = typeof prisma & {
  listing: {
    create: (args: { data: unknown }) => Promise<unknown>;
    update: (args: { where: unknown; data: unknown }) => Promise<unknown>;
  };
};

const listingSchema = z.object({
  inventoryId: z.string().uuid("Invalid inventory item"),
  platform: z.string().min(1, "Platform is required"),
  listingUrl: z.string().url().optional().or(z.literal("")),
  listingRef: z.string().optional(),
  listedPrice: z.coerce.number().positive("Listed price must be positive"),
  listedDate: z.coerce.date().optional(),
});

export async function createListing(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }
  try {
    await assertNotFrozen("Listing creation");
  } catch (error) {
    return { message: error instanceof Error ? error.message : "System is in freeze mode" };
  }

  const raw = Object.fromEntries(formData.entries());

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const governance = await getGovernanceConfig();

  const prismaWithListing = prisma as PrismaWithListing;

  try {
    if (governance.minImagesForListing > 0) {
      const imageCount = await prisma.inventoryMedia.count({
        where: { inventoryId: data.inventoryId, type: "IMAGE" }
      });
      if (imageCount < governance.minImagesForListing) {
        return { message: `At least ${governance.minImagesForListing} images are required before listing` };
      }
    }

    await prismaWithListing.listing.create({
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
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }
  try {
    await assertNotFrozen("Listing status update");
  } catch (error) {
    return { message: error instanceof Error ? error.message : "System is in freeze mode" };
  }

  const prismaWithListing = prisma as PrismaWithListing;

  try {
    await prismaWithListing.listing.update({
      where: { id },
      data: { status },
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to update listing status" };
  }

  revalidatePath("/listings");
}
