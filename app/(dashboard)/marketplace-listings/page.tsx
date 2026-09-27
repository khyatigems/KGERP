import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { MarketplaceSyncPanel } from "@/components/marketplace/sync-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function MarketplaceListingsPage() {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();

  const [shops, listings] = await Promise.all([
    prisma.marketplaceShop.findMany({
      where: { status: "CONNECTED", connection: { status: "CONNECTED" } },
      select: { id: true, marketplace: true, name: true },
      orderBy: [{ marketplace: "asc" }, { name: "asc" }],
    }),
    prisma.listing.findMany({
      where: { marketplaceShopId: { not: null } },
      orderBy: { lastSyncedAt: "desc" },
      take: 500,
      include: {
        marketplaceShop: { select: { name: true } },
        inventory: { select: { sku: true, itemName: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace Listings</h1>
          <p className="text-sm text-muted-foreground">External listings mapped to ERP products.</p>
        </div>
        <Button asChild variant="outline"><Link href="/marketplace-orders">Marketplace Orders</Link></Button>
      </div>

      <MarketplaceSyncPanel shops={shops} syncType="LISTINGS" />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Listing ID</TableHead>
            <TableHead>SKU / Product</TableHead><TableHead>Title</TableHead><TableHead>Price</TableHead>
            <TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Sync status</TableHead>
            <TableHead>Last synced</TableHead><TableHead>Error</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {listings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell>{listing.platform}</TableCell>
                <TableCell>{listing.marketplaceShop?.name || listing.marketplaceShopName || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{listing.externalId || "—"}</TableCell>
                <TableCell>{listing.inventory ? <><div>{listing.inventory.sku}</div><div className="text-xs text-muted-foreground">{listing.inventory.itemName}</div></> : listing.listingSku || "Unmapped"}</TableCell>
                <TableCell className="max-w-60 truncate">{listing.marketplaceTitle || "—"}</TableCell>
                <TableCell>{listing.marketplacePrice != null ? `${listing.currency} ${listing.marketplacePrice}` : "—"}</TableCell>
                <TableCell>{listing.marketplaceQuantity ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{listing.status}</Badge></TableCell>
                <TableCell><Badge variant={listing.syncStatus === "SYNCED" ? "default" : "secondary"}>{listing.syncStatus || "Imported"}</Badge></TableCell>
                <TableCell>{listing.lastSyncedAt?.toLocaleString() || "—"}</TableCell>
                <TableCell className="max-w-65 whitespace-normal text-xs text-destructive">{listing.syncError || "—"}</TableCell>
              </TableRow>
            ))}
            {listings.length === 0 && <TableRow><TableCell colSpan={11} className="h-24 text-center text-muted-foreground">No marketplace listings synced yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}