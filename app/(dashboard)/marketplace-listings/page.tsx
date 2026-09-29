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
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatMarketplaceDateTime } from "@/lib/utils";
import { MarketplaceListingsExport } from "@/components/marketplace/marketplace-listings-export";

export const dynamic = "force-dynamic";

export default async function MarketplaceListingsPage() {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();

  const [shops, listings, syncJobs] = await Promise.all([
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
        priceHistory: { orderBy: { changedAt: "desc" }, take: 2, select: { price: true, changedAt: true } },
      },
    }),
    prisma.marketplaceSyncJob.findMany({
      where: { syncType: "LISTINGS", status: { in: ["SUCCESS", "PARTIAL"] }, endedAt: { not: null } },
      orderBy: { endedAt: "desc" }, take: 100,
      select: { marketplaceShopId: true, endedAt: true },
    }),
  ]);
  const lastSyncByShop = new Map<string, Date>();
  for (const job of syncJobs) if (!lastSyncByShop.has(job.marketplaceShopId) && job.endedAt) lastSyncByShop.set(job.marketplaceShopId, job.endedAt);
  const listingImage = (raw: string | null) => raw?.match(/<(?:GalleryURL|PictureURL)>([^<]+)<\/(?:GalleryURL|PictureURL)>/i)?.[1] || null;
  const exportRows = listings.map((listing) => ({
    marketplace: listing.platform, shop: listing.marketplaceShop?.name || listing.marketplaceShopName || "—",
    listingId: listing.externalId || "", sku: listing.inventory?.sku || listing.listingSku || "Unmapped",
    title: listing.marketplaceTitle || "", price: listing.marketplacePrice == null ? "" : `${listing.currency} ${listing.marketplacePrice}`,
    quantity: String(listing.marketplaceQuantity ?? ""), status: listing.status, syncStatus: listing.syncStatus || "Imported",
    lastSynced: formatMarketplaceDateTime(listing.lastSyncedAt), listingUrl: listing.listingUrl || "",
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace Listings</h1>
          <p className="text-sm text-muted-foreground">External listings mapped to ERP products.</p>
        </div>
        <div className="flex gap-2"><MarketplaceListingsExport rows={exportRows} /><Button asChild variant="outline"><Link href="/marketplace-orders">Marketplace Orders</Link></Button></div>
      </div>

      <MarketplaceSyncPanel shops={shops} syncType="LISTINGS" />

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {shops.map((shop) => <div key={shop.id} className="rounded-md border px-3 py-2"><strong>{shop.marketplace} · {shop.name}</strong> · Last listings sync: {formatMarketplaceDateTime(lastSyncByShop.get(shop.id))}</div>)}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Image</TableHead><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Listing ID</TableHead>
            <TableHead>SKU / Product</TableHead><TableHead>Title</TableHead><TableHead>Price</TableHead>
            <TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Sync status</TableHead>
            <TableHead>Last synced</TableHead><TableHead>Error</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {listings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell>{listingImage(listing.rawMetadata) ? <img src={listingImage(listing.rawMetadata)!} alt="Listing" className="h-12 w-12 rounded object-cover" /> : "—"}</TableCell>
                <TableCell>{listing.platform}</TableCell>
                <TableCell>{listing.marketplaceShop?.name || listing.marketplaceShopName || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{listing.listingUrl ? <a href={listing.listingUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{listing.externalId || "Open"}</a> : listing.externalId || "—"}</TableCell>
                <TableCell>{listing.inventory ? <><div>{listing.inventory.sku}</div><div className="text-xs text-muted-foreground">{listing.inventory.itemName}</div></> : listing.listingSku || "Unmapped"}</TableCell>
                <TableCell className="min-w-72 max-w-md whitespace-normal break-words">{listing.marketplaceTitle || "—"}</TableCell>
                <TableCell>
                  {listing.marketplacePrice != null ? <div className="flex items-center gap-1">{`${listing.currency} ${listing.marketplacePrice}`}{listing.priceHistory.length > 1 && listing.priceHistory[0].price !== listing.priceHistory[1].price && (listing.priceHistory[0].price > listing.priceHistory[1].price ? <ArrowUp className="h-3.5 w-3.5 text-emerald-500" aria-label="Price increased" /> : <ArrowDown className="h-3.5 w-3.5 text-red-500" aria-label="Price decreased" />)}</div> : "—"}
                  {listing.priceHistory[0] && <div className="text-[10px] text-muted-foreground">Changed: {formatMarketplaceDateTime(listing.priceHistory[0].changedAt)}</div>}
                </TableCell>
                <TableCell>{listing.marketplaceQuantity ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{listing.status}</Badge></TableCell>
                <TableCell><Badge variant={listing.syncStatus === "SYNCED" ? "default" : "secondary"}>{listing.syncStatus || "Imported"}</Badge></TableCell>
                <TableCell>{formatMarketplaceDateTime(listing.lastSyncedAt)}</TableCell>
                <TableCell className="max-w-65 whitespace-normal text-xs text-destructive">{listing.syncError || "—"}</TableCell>
              </TableRow>
            ))}
            {listings.length === 0 && <TableRow><TableCell colSpan={12} className="h-24 text-center text-muted-foreground">No marketplace listings synced yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
