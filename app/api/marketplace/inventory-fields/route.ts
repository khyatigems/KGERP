import { loadProductFacts } from "@/lib/inventory-product-facts-store";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { loadInventoryMarketplaceFields } from "@/lib/marketplace/inventory-fields-store";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { EtsyConnector } from "@/lib/marketplace/connectors/etsy";
import { EBAY_TEMPLATE_CATEGORY_PATHS, isSensitiveEbayCertificateAspect } from "@/lib/marketplace/listing-preparation";
export async function GET(req: NextRequest) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 try {
  const shopId = req.nextUrl.searchParams.get("shopId"), inventoryId = req.nextUrl.searchParams.get("inventoryId");
  if (!shopId) return NextResponse.json({ shops: await prisma.marketplaceShop.findMany({ where: { marketplace: { in: ["EBAY", "ETSY"] }, status: "CONNECTED", connection: { status: "CONNECTED" } }, select: { id: true, name: true, marketplace: true }, orderBy: { name: "asc" } }), fields: inventoryId ? await loadInventoryMarketplaceFields(inventoryId) : [], productFacts: inventoryId ? await loadProductFacts(inventoryId) : null });
  const shop = await prisma.marketplaceShop.findFirst({ where: { id: shopId, status: "CONNECTED", connection: { status: "CONNECTED" }, marketplace: { in: ["EBAY", "ETSY"] } } });
  if (!shop) return NextResponse.json({ error: "Connected marketplace shop not found." }, { status: 404 });
  const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
  if (shop.marketplace === "ETSY") return NextResponse.json(await new EtsyConnector().getListingPreparationOptions(shop.connectionId, shop.externalShopId, categoryId));
  const type = req.nextUrl.searchParams.get("productType") === "JEWELRY" ? "JEWELRY" : "LOOSE_GEMSTONE";
  const taxonomy = await new EbayConnector().getCategoryAspects(shop.connectionId, EBAY_TEMPLATE_CATEGORY_PATHS[type], "EBAY_US", categoryId);
  return NextResponse.json({ ...taxonomy, requiredAspects: taxonomy.requiredAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name)), optionalAspects: taxonomy.optionalAspects.filter((aspect) => !isSensitiveEbayCertificateAspect(aspect.name)) });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Marketplace fields could not be loaded." }, { status: 422 }); }
}
