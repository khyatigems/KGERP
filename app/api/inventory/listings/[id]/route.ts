import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { revalidateTag } from "next/cache";

// PATCH - Update a listing
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canEdit = await checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { listingUrl, status, listedPrice, externalId, listingRef } = body;

    // Check if listing exists
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Update listing with correct Prisma field names
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...(listingUrl !== undefined && { listingUrl }),
        ...(status !== undefined && { status }),
        ...(listedPrice !== undefined && { listedPrice }),
        ...(externalId !== undefined && { externalId }),
        ...(listingRef !== undefined && { listingRef }),
        updatedAt: new Date(),
      },
    });

    // Revalidate cache
    revalidateTag("listings", "layout");

    return NextResponse.json({
      success: true,
      listing: {
        id: updated.id,
        inventoryId: updated.inventoryId,
        platform: updated.platform,
        listingUrl: updated.listingUrl,
        listingRef: updated.listingRef,
        externalId: updated.externalId,
        status: updated.status,
        listedPrice: updated.listedPrice,
        currency: updated.currency,
        listedDate: updated.listedDate,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Listing update error:", error);
    return NextResponse.json(
      { error: "Failed to update listing", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a listing
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canDelete = await checkUserPermission(userId, PERMISSIONS.INVENTORY_DELETE);
    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;

    // Check if listing exists
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Delete listing
    await prisma.listing.delete({
      where: { id },
    });

    // Revalidate cache
    revalidateTag("listings", "layout");

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Listing deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete listing", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET - Get a single listing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canView = await checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW);
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        inventory: {
          select: {
            sku: true,
            itemName: true,
            category: true,
            gemType: true,
            color: true,
            weightValue: true,
            sellingPrice: true,
            status: true,
            media: {
              select: { mediaUrl: true, isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("Listing fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
