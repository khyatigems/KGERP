import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { setListingItemHidden } from "@/lib/marketplace/listing-visibility";

const requestSchema = z.object({
  inventoryId: z.string().uuid(),
  shopId: z.string().min(1).max(200),
  marketplace: z.enum(["EBAY", "ETSY"]),
  hidden: z.boolean(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid item visibility request." }, { status: 400 });
  const input = parsed.data;
  try {
    const [shop, inventory] = await Promise.all([
      prisma.marketplaceShop.findFirst({
        where: { id: input.shopId, marketplace: input.marketplace, status: "CONNECTED", connection: { status: "CONNECTED" } },
        select: { id: true },
      }),
      prisma.inventory.findUnique({ where: { id: input.inventoryId }, select: { id: true } }),
    ]);
    if (!shop || !inventory) return NextResponse.json({ error: "Inventory item or connected marketplace shop not found." }, { status: 404 });
    await setListingItemHidden(prisma, input);
    return NextResponse.json({ success: true, hidden: input.hidden });
  } catch (error) {
    console.error("Unable to save listing visibility", error);
    return NextResponse.json({ error: "Unable to save item visibility. Please try again." }, { status: 500 });
  }
}
