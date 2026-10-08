import Link from "next/link";
import Image from "next/image";
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
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatMarketplaceDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 25;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function MarketplaceListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();

  const params = await searchParams;
  const marketplace = first(params.marketplace) || "";
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
    inventory: { select: { sku: true, itemName: true } },
    priceHistory: { orderBy: { changedAt: "desc" as const }, take: 2, select: { price: true, changedAt: true } },
  };
  const [shops, total, listings, exportListings, syncJobs, databaseClock] = await Promise.all([
    prisma.marketplaceShop.findMany({ where: { status: "CONNECTED", connection: { status: "CONNECTED" } }, select: { id: true, marketplace: true, name: true }, orderBy: [{ marketplace: "asc" }, { name: "asc" }] }),
    prisma.listing.count({ where }),
    prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listingInclude }),
    prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, include: { marketplaceShop: { select: { name: true } }, inventory: { select: { sku: true } } } }),
    prisma.marketplaceSyncJob.findMany({ where: { syncType: "LISTINGS", status: { in: ["SUCCESS", "PARTIAL"] }, endedAt: { not: null } }, orderBy: { endedAt: "desc" }, take: 100, select: { marketplaceShopId: true, endedAt: true } }),
    prisma.$queryRaw<Array<{ nowMs: number }>>`SELECT CAST(strftime('%s', 'now') AS INTEGER) * 1000 AS nowMs`,
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageListings = safePage === page ? listings : await prisma.listing.findMany({ where, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listingInclude });
  const lastSyncByShop = new Map<string, Date>();
  for (const job of syncJobs) if (!lastSyncByShop.has(job.marketplaceShopId) && job.endedAt) lastSyncByShop.set(job.marketplaceShopId, job.endedAt);
  const listingImage = (raw: string | null) => {
    // eBay stores XML while Etsy stores its source response as JSON.
    const ebayImage = raw?.match(/<(?:GalleryURL|PictureURL)>([^<]+)<\/(?:GalleryURL|PictureURL)>/i)?.[1];
    if (ebayImage) return ebayImage;
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw) as { images?: unknown; Images?: unknown };
      const images = Array.isArray(payload.images) ? payload.images : Array.isArray(payload.Images) ? payload.Images : [];
      for (const image of images) {
        if (!image || typeof image !== "object") continue;
        const candidate = image as Record<string, unknown>;
        for (const field of ["url_fullxfull", "url_570xN", "url_170x135", "url"]) {
          if (typeof candidate[field] === "string" && candidate[field]) return candidate[field];
        }
      }
    } catch {
      // Raw metadata from older syncs may not be valid JSON.
    }
    return null;
  };
  const exportRows = exportListings.map((listing) => ({
    marketplace: listing.platform, shop: listing.marketplaceShop?.name || listing.marketplaceShopName || "—", listingId: listing.externalId || "", sku: listing.inventory?.sku || listing.listingSku || "Unmapped",
    title: listing.marketplaceTitle || "", price: listing.marketplacePrice == null ? "" : `${listing.currency} ${listing.marketplacePrice}`, quantity: String(listing.marketplaceQuantity ?? ""), status: listing.status,
    syncStatus: listing.syncStatus || "Imported", lastSynced: formatMarketplaceDateTime(listing.lastSyncedAt), listingUrl: listing.listingUrl || "",
  }));
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (marketplace) next.set("marketplace", marketplace); if (shopId) next.set("shop", shopId); if (status) next.set("status", status); if (match) next.set("match", match); if (query) next.set("q", query);
    next.set("page", String(nextPage)); return `/marketplace-listings?${next.toString()}`;
  };
  const newSince = Number(databaseClock[0]?.nowMs ?? 0) - 24 * 60 * 60 * 1000;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Marketplace Listings</h1><p className="text-sm text-muted-foreground">External listings mapped to ERP products.</p></div><div className="flex flex-wrap gap-2"><MarketplaceListingsExport rows={exportRows} /><Button asChild variant="outline"><Link href="/marketplace-orders">Marketplace Orders</Link></Button></div></div>
    <MarketplaceSyncPanel shops={shops} syncType="LISTINGS" />
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{shops.map((shop) => <div key={shop.id} className="rounded-md border px-3 py-2"><strong>{shop.marketplace} · {shop.name}</strong> · Last listings sync: {formatMarketplaceDateTime(lastSyncByShop.get(shop.id))}</div>)}</div>
    <form className="grid gap-2 rounded-md border p-3 md:grid-cols-6" action="/marketplace-listings" method="get">
      <input name="q" defaultValue={query} placeholder="Search title, SKU or ID" className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" />
      <select name="marketplace" defaultValue={marketplace} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All marketplaces</option>{[...new Set(shops.map((shop) => shop.marketplace))].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select name="shop" defaultValue={shopId} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All shops</option>{shops.filter((shop) => !marketplace || shop.marketplace === marketplace).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select>
      <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All listing states</option><option value="ACTIVE">Active</option><option value="ENDED">Ended</option><option value="SOLD">Sold</option></select>
      <select name="match" defaultValue={match} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All match states</option><option value="SYNCED">Matched</option><option value="UNKNOWN_SKU">Unknown SKU</option><option value="MISMATCH">SKU mismatch</option></select>
      <div className="flex gap-2 md:col-span-6"><Button type="submit" size="sm">Apply filters</Button><Button asChild variant="outline" size="sm"><Link href="/marketplace-listings">Clear</Link></Button><span className="self-center text-xs text-muted-foreground">{total} matching listings · exports include all matching rows (up to 5,000).</span></div>
    </form>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Listing ID</TableHead><TableHead>SKU / Product</TableHead><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Sync status</TableHead><TableHead>Last synced</TableHead><TableHead>Error</TableHead></TableRow></TableHeader><TableBody>
      {pageListings.map((listing) => { const isNew = listing.createdAt.getTime() >= newSince && (listing.lastSyncedAt?.getTime() || 0) >= newSince; const imageUrl = listingImage(listing.rawMetadata); return <TableRow key={listing.id}>
        <TableCell>{imageUrl ? <Image src={imageUrl} alt="Listing" width={48} height={48} unoptimized className="h-12 w-12 rounded object-cover" /> : "—"}</TableCell><TableCell>{listing.platform}</TableCell><TableCell>{listing.marketplaceShop?.name || listing.marketplaceShopName || "—"}</TableCell><TableCell className="font-mono text-xs"><div className="flex items-center gap-1">{listing.listingUrl ? <a href={listing.listingUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{listing.externalId || "Open"}</a> : listing.externalId || "—"}{isNew && <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">NEW</Badge>}</div></TableCell>
        <TableCell>{listing.inventory ? <><div>{listing.inventory.sku}</div><div className="text-xs text-muted-foreground">{listing.inventory.itemName}</div></> : listing.listingSku || "Unmapped"}</TableCell><TableCell className="min-w-72 max-w-md whitespace-normal wrap-break-word">{listing.marketplaceTitle || "—"}</TableCell><TableCell>{listing.marketplacePrice != null ? <div className="flex items-center gap-1">{`${listing.currency} ${listing.marketplacePrice}`}{listing.priceHistory.length > 1 && listing.priceHistory[0].price !== listing.priceHistory[1].price && (listing.priceHistory[0].price > listing.priceHistory[1].price ? <ArrowUp className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDown className="h-3.5 w-3.5 text-red-500" />)}</div> : "—"}{listing.priceHistory[0] && <div className="text-[10px] text-muted-foreground">Changed: {formatMarketplaceDateTime(listing.priceHistory[0].changedAt)}</div>}</TableCell>
        <TableCell>{listing.marketplaceQuantity ?? "—"}</TableCell><TableCell><Badge variant="outline">{listing.status}</Badge></TableCell><TableCell><Badge variant={listing.syncStatus === "SYNCED" ? "default" : "secondary"}>{listing.syncStatus || "Imported"}</Badge></TableCell><TableCell>{formatMarketplaceDateTime(listing.lastSyncedAt)}</TableCell><TableCell className="max-w-65 whitespace-normal text-xs text-destructive">{listing.syncError || "—"}</TableCell>
      </TableRow>; })}
      {pageListings.length === 0 && <TableRow><TableCell colSpan={12} className="h-24 text-center text-muted-foreground">No marketplace listings match these filters.</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex items-center justify-between text-sm"><span>Page {safePage} of {totalPages}</span><div className="flex gap-2"><Button asChild variant="outline" size="sm" disabled={safePage <= 1}><Link href={pageHref(Math.max(1, safePage - 1))}>Previous</Link></Button><Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}><Link href={pageHref(Math.min(totalPages, safePage + 1))}>Next</Link></Button></div></div>
  </div>;
}
