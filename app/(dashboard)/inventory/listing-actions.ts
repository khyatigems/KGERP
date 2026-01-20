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
  currency: z.string().default("INR"),
  status: z.string().default("LISTED"),
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
        currency: data.currency,
        status: data.status,
        priceHistory: {
          create: {
            price: data.listedPrice,
            changedBy: session.user?.id || session.user?.email || "Unknown",
          }
        }
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
    revalidatePath("/listings");
    return { success: true, listing };
  } catch (error) {
    console.error("addListing error:", error);
    return { 
        success: false, 
        message: `Failed to create listing: ${error instanceof Error ? error.message : String(error)}` 
    };
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

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.listing.update({
                where: { id },
                data: {
                    platform: data.platform,
                    listingUrl: data.listingUrl || null,
                    listingRef: data.listingRef,
                    listedPrice: data.listedPrice,
                    currency: data.currency,
                    status: data.status,
                }
            });

            if (data.listedPrice !== undefined && data.listedPrice !== existing.listedPrice) {
                await tx.listingPriceHistory.create({
                    data: {
                        listingId: id,
                        price: data.listedPrice,
                        changedBy: session.user?.id || session.user?.email || "Unknown",
                    }
                });
            }
            return result;
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
        revalidatePath("/listings");
        return { success: true, listing: updated };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to update listing" };
    }
}

export async function getListingHistory(listingId: string) {
    try {
        const history = await prisma.listingPriceHistory.findMany({
            where: { listingId },
            orderBy: { changedAt: "desc" }
        });
        return { success: true, history };
    } catch (error) {
        console.error(error);
        return { success: false, history: [] };
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
        revalidatePath("/listings");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to delete listing" };
    }
}

export async function updateListingsStatus(ids: string[], status: string) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const listings = await prisma.listing.findMany({
            where: { id: { in: ids } },
            include: { inventory: { select: { sku: true } } }
        });

        await prisma.listing.updateMany({
            where: { id: { in: ids } },
            data: { status }
        });

        // Log activities
        for (const listing of listings) {
            await logActivity({
                entityType: "Listing",
                entityId: listing.id,
                entityIdentifier: `${listing.platform} - ${listing.inventory.sku}`,
                actionType: "EDIT",
                oldData: { status: listing.status },
                newData: { status },
            });
        }

        revalidatePath("/inventory");
        revalidatePath("/listings");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to update listings status" };
    }
}

export async function deleteListings(ids: string[]) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const listings = await prisma.listing.findMany({
            where: { id: { in: ids } },
            include: { inventory: { select: { sku: true } } }
        });

        await prisma.listing.deleteMany({
            where: { id: { in: ids } }
        });

        // Log activities for each deleted listing
        for (const listing of listings) {
            await logActivity({
                entityType: "Listing",
                entityId: listing.id,
                entityIdentifier: `${listing.platform} - ${listing.inventory.sku}`,
                actionType: "DELETE",
                oldData: listing,
            });
        }

        revalidatePath("/inventory");
        revalidatePath("/listings");
        // We can't easily revalidate every inventory item page, but the main inventory list is updated.
        
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to delete listings" };
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
