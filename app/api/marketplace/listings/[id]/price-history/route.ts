import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) return NextResponse.json({ error: permission.message }, { status: 403 });
  await ensureMarketplaceFoundationSchema();
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id }, select: { marketplaceShopId: true, currency: true } });
  if (!listing?.marketplaceShopId) return NextResponse.json({ error: "Marketplace listing not found" }, { status: 404 });
  const history = await prisma.listingPriceHistory.findMany({ where: { listingId: id }, orderBy: [{ changedAt: "desc" }, { id: "desc" }], select: { id: true, price: true, currency: true, changedAt: true, changedBy: true } });
  return NextResponse.json({ history, currency: listing.currency }, { headers: { "Cache-Control": "private, no-store" } });
}
