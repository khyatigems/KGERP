"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

const listingSchema = z.object({
  inventoryId: z.string().uuid(),
  platform: z.string().min(1, "Platform is required"),
  listingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  listingRef: z.string().optional(),
  listedPrice: z.coerce.number().positive("Price must be positive"),
  status: z.string().default("ACTIVE"),
});

export async function addListing(data: z.infer<typeof listingSchema>) {
  const session = await auth();
  if (!session) return { success: false, message: "Unauthorized" };

  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: "Invalid data", errors: parsed.error.flatten().fieldErrors };

  try {
    const inventory = await prisma.inventory.findUnique({
        where: { id: data.inventoryId },
        select: { sku: true }
    });

    if (!inventory) return { success: false, message: "Inventory item not found" };

    const listing = await prisma.listing.create({
      data: {
        inventoryId: data.inventoryId,
        platform: data.platform,
        listingUrl: data.listingUrl || null,
        listingRef: data.listingRef,
        listedPrice: data.listedPrice,
        status: data.status,
      },
    });

    await logActivity({
        entityType: "Listing",
        entityId: listing.id,
        entityIdentifier: `${data.platform} - ${inventory.sku}`,
        actionType: "CREATE",
        newData: listing,
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${data.inventoryId}`);
    return { success: true, listing };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create listing" };
  }
}

export async function updateListing(id: string, data: Partial<z.infer<typeof listingSchema>>) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const existing = await prisma.listing.findUnique({ 
            where: { id },
            include: { inventory: { select: { sku: true } } }
        });

        if (!existing) return { success: false, message: "Listing not found" };

        const updated = await prisma.listing.update({
            where: { id },
            data: {
                platform: data.platform,
                listingUrl: data.listingUrl || null,
                listingRef: data.listingRef,
                listedPrice: data.listedPrice,
                status: data.status,
            }
        });

        await logActivity({
            entityType: "Listing",
            entityId: id,
            entityIdentifier: `${updated.platform} - ${existing.inventory.sku}`,
            actionType: "EDIT",
            oldData: existing,
            newData: updated,
        });

        revalidatePath("/inventory");
        revalidatePath(`/inventory/${existing.inventoryId}`);
        return { success: true, listing: updated };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to update listing" };
    }
}

export async function deleteListing(id: string) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const existing = await prisma.listing.findUnique({ 
            where: { id },
            include: { inventory: { select: { sku: true } } }
        });

        if (!existing) return { success: false, message: "Listing not found" };

        await prisma.listing.delete({ where: { id } });

        await logActivity({
            entityType: "Listing",
            entityId: id,
            entityIdentifier: `${existing.platform} - ${existing.inventory.sku}`,
            actionType: "DELETE",
            oldData: existing,
        });

        revalidatePath("/inventory");
        revalidatePath(`/inventory/${existing.inventoryId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to delete listing" };
    }
}

export async function getListings(inventoryId: string) {
    try {
        const listings = await prisma.listing.findMany({
            where: { inventoryId },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, listings };
    } catch (error) {
        console.error(error);
        return { success: false, listings: [] };
    }
}
