import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const listings = await prisma.listing.findMany({
      where: {
        inventoryId: id,
        status: { in: ["LISTED", "ACTIVE"] },
      },
      select: {
        id: true,
        platform: true,
        listingUrl: true,
      },
    });

    return NextResponse.json({ activeListings: listings });
  } catch (error: unknown) {
    console.error("Failed to fetch listings", error);
    return NextResponse.json(
      { activeListings: [] },
      { status: 500 }
    );
  }
}

