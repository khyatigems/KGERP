import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { MarketplaceSyncPanel } from "@/components/marketplace/sync-panel";
import { MarketplaceListingsExport } from "@/components/marketplace/marketplace-listings-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListingPrice } from "@/components/marketplace/listing-price";
import { ListingImage } from "@/components/marketplace/listing-image";
import { readListingDetails, marketplaceImageUrl } from "@/lib/marketplace/listing-details";
import { formatMarketplaceDateTime } from "@/lib/utils";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 25;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function MarketplaceListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  const params = await searchParams;
  const marketplace = first(params.marketplace) || "";
  if (marketplace === "WEBSITE") redirect("/website-management");
  await ensureMarketplaceFoundationSchema();
  const shopId = first(params.shop) || "";
  const status = first(params.status) ?? "ACTIVE";
  const match = first(params.match) || "";
  const query = (first(params.q) || "").trim();
  const requestedPage = Number(first(params.page) || "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const where: Prisma.ListingWhereInput = { marketplaceShopId: { not: null } };
  if (marketplace) where.platform = marketplace;
  if (shopId) where.marketplaceShopId = shopId;
  if (status) where.status = status;
  if (match) where.syncStatus = match;
  if (query) where.OR = [
    { externalId: { contains: query } },
    { listingSku: { contains: query } },
    { marketplaceTitle: { contains: query } },
    { inventory: { is: { OR: [{ sku: { contains: query } }, { itemName: { contains: query } }] } } },
  ];

  const listingInclude = {
    marketplaceShop: { select: { name: true } },
    inventory: { select: { sku: true, itemName: true, imageUrl: true, media: { where: { type: "IMAGE" }, orderBy: { isPrimary: "desc" as const }, take: 2, select: { mediaUrl: true } } } },
    priceHistory: { orderBy: { changedAt: "desc" as const }, take: 2, select: { price: true, changedAt: true, currency: true } },
  };
  const [shops, total, listings, exportListings, syncJobs, databaseClock] = await Promise.all([
    prisma.marketplaceShop.findMany({ select: { id: true, marketplace: true, name: true, status: true, connection: { select: { status: true } } }, orderBy: [{ marketplace: "asc" }, { name: "asc" }] }),
    prisma.listing.count({ where }),
    prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listingInclude }),
    prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, include: { marketplaceShop: { select: { name: true } }, inventory: { select: { sku: true } }, priceHistory: listingInclude.priceHistory } }),
    prisma.marketplaceSyncJob.findMany({ where: { syncType: "LISTINGS", status: { in: ["SUCCESS", "PARTIAL"] }, endedAt: { not: null } }, orderBy: { endedAt: "desc" }, take: 100, select: { marketplaceShopId: true, endedAt: true } }),
    prisma.$queryRaw<Array<{ nowMs: number }>>`SELECT CAST(strftime('%s', 'now') AS INTEGER) * 1000 AS nowMs`,
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageListings = safePage === page ? listings : await prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listingInclude });
  const lastSyncByShop = new Map<string, Date>();
  for (const job of syncJobs) if (!lastSyncByShop.has(job.marketplaceShopId) && job.endedAt) lastSyncByShop.set(job.marketplaceShopId, job.endedAt);
  const exportRows = exportListings.map((listing) => ({
    marketplace: listing.platform, shop: listing.marketplaceShop?.name || listing.marketplaceShopName || "—", listingId: listing.externalId || "", sku: listing.inventory?.sku || listing.listingSku || "Unmapped",
    title: listing.marketplaceTitle || "", price: listing.marketplacePrice == null ? "" : `${listing.currency} ${listing.marketplacePrice}`, quantity: String(listing.marketplaceQuantity ?? ""), status: listing.status,
    syncStatus: listing.syncStatus || "Imported", lastSynced: formatMarketplaceDateTime(listing.lastSyncedAt), listingUrl: listing.listingUrl || "",
    previousPrice: listing.priceHistory[1] ? `${listing.priceHistory[1].currency || listing.currency} ${listing.priceHistory[1].price}` : "",
    priceObservedAt: formatMarketplaceDateTime(listing.priceHistory[0]?.changedAt),
    views: String(listing.marketplaceViews ?? ""), favorites: String(listing.marketplaceFavorites ?? ""), soldQuantity: listing.platform === "EBAY" ? String(listing.marketplaceOrders ?? "") : "",
    viewsPeriod: readListingDetails(listing.rawMetadata).viewsPeriod || "", impressions: String(readListingDetails(listing.rawMetadata).impressions ?? ""),
    imageUrl: readListingDetails(listing.rawMetadata).images[0] || "", category: readListingDetails(listing.rawMetadata).category || "",
  }));
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (marketplace) next.set("marketplace", marketplace); if (shopId) next.set("shop", shopId); if (status) next.set("status", status); if (match) next.set("match", match); if (query) next.set("q", query);
    next.set("page", String(nextPage)); return `/marketplace-listings?${next.toString()}`;
  };
  const newSince = Number(databaseClock[0]?.nowMs ?? 0) - 24 * 60 * 60 * 1000;

  return <div className="space-y-5">
    <WorkspaceHeader eyebrow="KhyatiGems · Marketplaces"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Marketplace Listings</h1><p className="text-sm text-muted-foreground">External listings mapped to ERP products.</p></div><div className="flex flex-wrap gap-2"><MarketplaceListingsExport rows={exportRows} /><Button asChild variant="outline"><Link href="/marketplace-orders">Marketplace Orders</Link></Button></div></div></WorkspaceHeader>
    <MarketplaceSyncPanel shops={shops.filter((shop) => shop.status === "CONNECTED" && shop.connection.status === "CONNECTED")} syncType="LISTINGS" />
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{shops.map((shop) => <div key={shop.id} className="rounded-md border px-3 py-2"><strong>{shop.marketplace} · {shop.name}</strong> · Last listings sync: {formatMarketplaceDateTime(lastSyncByShop.get(shop.id))}</div>)}</div>
    <form className="grid gap-2 rounded-md border p-3 md:grid-cols-6" action="/marketplace-listings" method="get">
      <input name="q" defaultValue={query} placeholder="Search title, SKU or ID" className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" />
      <select name="marketplace" defaultValue={marketplace} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All marketplaces</option>{[...new Set(shops.map((shop) => shop.marketplace))].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select name="shop" defaultValue={shopId} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All shops</option>{shops.filter((shop) => !marketplace || shop.marketplace === marketplace).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select>
      <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All listing states</option><option value="ACTIVE">Active</option><option value="ENDED">Ended</option><option value="SOLD">Sold</option></select>
      <select name="match" defaultValue={match} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All match states</option><option value="SYNCED">Matched</option><option value="UNKNOWN_SKU">Unknown SKU</option><option value="MISMATCH">SKU mismatch</option></select>
      <div className="flex gap-2 md:col-span-6"><Button type="submit" size="sm">Apply filters</Button><Button asChild variant="outline" size="sm"><Link href="/marketplace-listings">Clear</Link></Button><span className="self-center text-xs text-muted-foreground">{total} matching listings · exports include all matching rows (up to 5,000).</span></div>
    </form>
    <p className="text-xs text-muted-foreground">eBay views and impressions cover the last 30 completed days (UTC); Etsy views update daily. Favorites are eBay watchers or Etsy favorites. — means unavailable. Price history records amounts observed during sync, including the saved price before a change.</p>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Listing ID</TableHead><TableHead>SKU / Product</TableHead><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead><TableHead>Views</TableHead><TableHead>Favorites / Watchers</TableHead><TableHead>Impressions</TableHead><TableHead>Sold qty (eBay)</TableHead><TableHead>Details</TableHead><TableHead>Status</TableHead><TableHead>Sync status</TableHead><TableHead>Last synced</TableHead><TableHead>Error</TableHead></TableRow></TableHeader><TableBody>
      {pageListings.map((listing) => { const isNew = listing.createdAt.getTime() >= newSince && (listing.lastSyncedAt?.getTime() || 0) >= newSince; const details = readListingDetails(listing.rawMetadata); const imageUrls = [...new Set([...details.images, listing.inventory?.imageUrl, ...(listing.inventory?.media.map((media) => media.mediaUrl) || [])].map(marketplaceImageUrl).filter((url): url is string => Boolean(url)))]; return <TableRow key={listing.id}>
        <TableCell><ListingImage key={imageUrls.join("|")} urls={imageUrls} title={listing.marketplaceTitle || "Listing"} /></TableCell><TableCell>{listing.platform}</TableCell><TableCell>{listing.marketplaceShop?.name || listing.marketplaceShopName || "—"}</TableCell><TableCell className="font-mono text-xs"><div className="flex items-center gap-1">{listing.listingUrl ? <a href={listing.listingUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{listing.externalId || "Open"}</a> : listing.externalId || "—"}{isNew && <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">NEW</Badge>}</div></TableCell>
        <TableCell>{listing.inventory ? <><div>{listing.inventory.sku}</div><div className="text-xs text-muted-foreground">{listing.inventory.itemName}</div></> : listing.listingSku || "Unmapped"}</TableCell><TableCell className="min-w-72 max-w-md whitespace-normal wrap-break-word">{listing.marketplaceTitle || "—"}</TableCell><TableCell><ListingPrice listingId={listing.id} price={listing.marketplacePrice} currency={listing.currency} recent={listing.priceHistory.map((entry) => ({ ...entry, changedAt: entry.changedAt.toISOString() }))} title={listing.marketplaceTitle || listing.externalId || "Listing"} /></TableCell>
        <TableCell>{listing.marketplaceQuantity ?? "—"}</TableCell>
        <TableCell className="min-w-40"><div>{listing.marketplaceViews?.toLocaleString("en-IN") ?? "—"}</div><div className="whitespace-normal text-[10px] text-muted-foreground">{details.viewsPeriod || (listing.platform === "ETSY" ? "Updated daily" : "")}</div>{details.metricsUpdatedAt && <div className="whitespace-normal text-[10px] text-muted-foreground">Data as of {formatMarketplaceDateTime(details.metricsUpdatedAt)}</div>}{details.metricsWarning && <div className="mt-1 whitespace-normal text-xs text-amber-600 dark:text-amber-400">{details.metricsWarning}</div>}</TableCell>
        <TableCell>{listing.marketplaceFavorites?.toLocaleString("en-IN") ?? "—"}</TableCell><TableCell>{details.impressions?.toLocaleString("en-IN") ?? "—"}</TableCell><TableCell>{listing.platform === "EBAY" ? listing.marketplaceOrders ?? "—" : "—"}</TableCell>
        <TableCell className="min-w-44 max-w-64 whitespace-normal text-xs"><details><summary className="cursor-pointer text-primary">Listing details</summary><div className="mt-2 space-y-1 text-muted-foreground"><div>Category: {details.category || "—"}</div><div>Type: {details.listingType || "—"}</div><div>Photos: {details.images.length}</div><div>Started: {formatMarketplaceDateTime(details.startedAt)}</div><div>Ends: {formatMarketplaceDateTime(details.endsAt)}</div>{details.updatedAt && <div>Marketplace updated: {formatMarketplaceDateTime(details.updatedAt)}</div>}{details.hasVariations != null && <div>Variations: {details.hasVariations ? "Yes" : "No"}</div>}{details.tags?.length ? <div>Tags: {details.tags.join(", ")}</div> : null}</div></details></TableCell><TableCell><Badge variant="outline">{listing.status}</Badge></TableCell><TableCell><Badge variant={listing.syncStatus === "SYNCED" ? "default" : "secondary"}>{listing.syncStatus || "Imported"}</Badge></TableCell><TableCell>{formatMarketplaceDateTime(listing.lastSyncedAt)}</TableCell><TableCell className="max-w-65 whitespace-normal text-xs text-destructive">{listing.syncError || "—"}</TableCell>
      </TableRow>; })}
      {pageListings.length === 0 && <TableRow><TableCell colSpan={17} className="h-24 text-center text-muted-foreground">No marketplace listings match these filters.</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex items-center justify-between text-sm"><span>Page {safePage} of {totalPages}</span><div className="flex gap-2"><Button asChild variant="outline" size="sm" disabled={safePage <= 1}><Link href={pageHref(Math.max(1, safePage - 1))}>Previous</Link></Button><Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}><Link href={pageHref(Math.min(totalPages, safePage + 1))}>Next</Link></Button></div></div>
  </div>;
}
