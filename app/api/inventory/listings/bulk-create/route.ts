import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canCreate = await checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT);
    if (!canCreate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { inventoryIds, platform, defaultUrl } = body;

    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    // Fetch inventory items
    const inventoryItems = await prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: {
        id: true,
        sku: true,
        itemName: true,
        sellingPrice: true,
        status: true,
        media: {
          select: { mediaUrl: true, isPrimary: true },
          take: 1,
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    // Create listings
    const listings = [];
    for (const item of inventoryItems) {
      // Check if listing already exists for this item on this platform
      const existingListing = await prisma.listing.findFirst({
        where: {
          inventoryId: item.id,
          platform: platform,
        },
      });

      if (existingListing) {
        // Update existing listing
        const updated = await prisma.listing.update({
          where: { id: existingListing.id },
          data: {
            listingUrl: defaultUrl || existingListing.listingUrl,
            listedPrice: item.sellingPrice,
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });
        listings.push(updated);
      } else {
        // Create new listing
        const created = await prisma.listing.create({
          data: {
            inventoryId: item.id,
            platform: platform,
            listingUrl: defaultUrl || "",
            externalId: "", // Will be updated when actual listing is created on platform
            status: "ACTIVE",
            listedPrice: item.sellingPrice,
            currency: "INR",
          },
        });
        listings.push(created);
      }
    }

    // Revalidate cache
    revalidateTag("listings");
    revalidateTag("inventory");

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings: listings.map(l => ({
        id: l.id,
        inventoryId: l.inventoryId,
        platform: l.platform,
        listingUrl: l.listingUrl,
        listingRef: l.listingRef,
        externalId: l.externalId,
        status: l.status,
        listedPrice: l.listedPrice,
        currency: l.currency,
        listedDate: l.listedDate,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Bulk listings creation error:", error);
    return NextResponse.json(
      { error: "Failed to create listings", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
