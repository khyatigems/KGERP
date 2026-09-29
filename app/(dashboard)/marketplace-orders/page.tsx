import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { MarketplaceSyncPanel } from "@/components/marketplace/sync-panel";
import { MarketplaceOrdersExport } from "@/components/marketplace/marketplace-orders-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMarketplaceDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 25;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function MarketplaceOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();
  const params = await searchParams;
  const marketplace = first(params.marketplace) || "";
  const shopId = first(params.shop) || "";
  const status = first(params.status) || "";
  const match = first(params.match) || "";
  const query = (first(params.q) || "").trim();
  const requestedPage = Number(first(params.page) || "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const where: Prisma.MarketplaceOrderWhereInput = { marketplaceShopId: { not: null } };
  if (marketplace) where.marketplace = marketplace;
  if (shopId) where.marketplaceShopId = shopId;
  if (status) where.status = status;
  if (match) where.items = { some: { status: match } };
  if (query) where.OR = [
    { marketplaceOrderId: { contains: query } }, { orderNumber: { contains: query } }, { buyerName: { contains: query } },
    { items: { some: { OR: [{ listedSku: { contains: query } }, { listedTitle: { contains: query } }] } } },
  ];
  const orderInclude = { marketplaceShop: { select: { name: true } }, items: true };
  const [shops, total, orders, exportOrders, syncJobs] = await Promise.all([
    prisma.marketplaceShop.findMany({ where: { status: "CONNECTED", connection: { status: "CONNECTED" } }, select: { id: true, marketplace: true, name: true }, orderBy: [{ marketplace: "asc" }, { name: "asc" }] }),
    prisma.marketplaceOrder.count({ where }),
    prisma.marketplaceOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: orderInclude }),
    prisma.marketplaceOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, include: orderInclude }),
    prisma.marketplaceSyncJob.findMany({ where: { syncType: "ORDERS", status: { in: ["SUCCESS", "PARTIAL"] }, endedAt: { not: null } }, orderBy: { endedAt: "desc" }, take: 100, select: { marketplaceShopId: true, endedAt: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = safePage === page ? orders : await prisma.marketplaceOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * PAGE_SIZE, take: PAGE_SIZE, include: orderInclude });
  const lastSyncByShop = new Map<string, Date>();
  for (const job of syncJobs) if (!lastSyncByShop.has(job.marketplaceShopId) && job.endedAt) lastSyncByShop.set(job.marketplaceShopId, job.endedAt);
  const orderImage = (raw: string | null) => { try { const value = JSON.parse(raw || "{}"); return typeof value.imageUrl === "string" ? value.imageUrl : typeof value.image?.imageUrl === "string" ? value.image.imageUrl : null; } catch { return null; } };
  const exportRows = exportOrders.map((order) => ({
    marketplace: order.marketplace, shop: order.marketplaceShop?.name || order.marketplaceShopName || "Legacy", orderId: order.marketplaceOrderId, orderNumber: order.orderNumber || "",
    customer: order.buyerName || "", items: order.items.map((item) => item.listedSku || item.listedTitle || "—").join("; "), total: order.orderTotal == null ? "" : `${order.currency} ${order.orderTotal}`,
    status: order.status, orderDate: formatMarketplaceDateTime(order.orderDate), lastSynced: formatMarketplaceDateTime(order.lastSyncedAt),
  }));
  const pageHref = (nextPage: number) => { const next = new URLSearchParams(); if (marketplace) next.set("marketplace", marketplace); if (shopId) next.set("shop", shopId); if (status) next.set("status", status); if (match) next.set("match", match); if (query) next.set("q", query); next.set("page", String(nextPage)); return `/marketplace-orders?${next.toString()}`; };
  const newSince = Date.now() - 24 * 60 * 60 * 1000;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Marketplace Orders</h1><p className="text-sm text-muted-foreground">Orders imported from connected marketplace shops.</p></div><div className="flex flex-wrap gap-2"><MarketplaceOrdersExport rows={exportRows} /><Button asChild variant="outline"><Link href="/marketplace-listings">Marketplace Listings</Link></Button></div></div>
    <MarketplaceSyncPanel shops={shops} syncType="ORDERS" />
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{shops.map((shop) => <div key={shop.id} className="rounded-md border px-3 py-2"><strong>{shop.marketplace} · {shop.name}</strong> · Last orders sync: {formatMarketplaceDateTime(lastSyncByShop.get(shop.id))}</div>)}</div>
    <form className="grid gap-2 rounded-md border p-3 md:grid-cols-6" action="/marketplace-orders" method="get">
      <input name="q" defaultValue={query} placeholder="Search order, customer or SKU" className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" />
      <select name="marketplace" defaultValue={marketplace} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All marketplaces</option>{[...new Set(shops.map((shop) => shop.marketplace))].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select name="shop" defaultValue={shopId} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All shops</option>{shops.filter((shop) => !marketplace || shop.marketplace === marketplace).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select>
      <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All order states</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="FULFILLED">Fulfilled</option></select>
      <select name="match" defaultValue={match} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All item match states</option><option value="MATCHED">Matched</option><option value="UNKNOWN_SKU">Unknown SKU</option><option value="NO_SKU">No SKU</option></select>
      <div className="flex gap-2 md:col-span-6"><Button type="submit" size="sm">Apply filters</Button><Button asChild variant="outline" size="sm"><Link href="/marketplace-orders">Clear</Link></Button><span className="self-center text-xs text-muted-foreground">{total} matching orders · exports include all matching rows (up to 5,000).</span></div>
    </form>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Order ID</TableHead><TableHead>Order number</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Last synced</TableHead></TableRow></TableHeader><TableBody>
      {pageOrders.map((order) => { const isNew = order.createdAt.getTime() >= newSince && (order.lastSyncedAt?.getTime() || 0) >= newSince; return <TableRow key={order.id}><TableCell>{order.marketplace}</TableCell><TableCell>{order.marketplaceShop?.name || order.marketplaceShopName || "Legacy"}</TableCell><TableCell className="font-mono text-xs"><div className="flex items-center gap-1">{order.marketplaceOrderId}{isNew && <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">NEW</Badge>}</div></TableCell><TableCell>{order.orderNumber || "—"}</TableCell><TableCell>{order.buyerName || "—"}</TableCell><TableCell><div className="space-y-1">{order.items.map((item) => <div key={item.id} className="flex items-center gap-2">{orderImage(item.rawMetadata) ? <img src={orderImage(item.rawMetadata)!} alt="Order item" className="h-9 w-9 rounded object-cover" /> : null}<span>{item.listedSku || item.listedTitle || "—"}</span>{item.status !== "MATCHED" && <Badge variant="destructive" className="text-[10px]">{item.status}</Badge>}</div>)}</div></TableCell><TableCell>{order.orderTotal != null ? `${order.currency} ${order.orderTotal}` : "—"}</TableCell><TableCell><Badge variant="outline">{order.status}</Badge></TableCell><TableCell>{formatMarketplaceDateTime(order.orderDate)}</TableCell><TableCell>{formatMarketplaceDateTime(order.lastSyncedAt)}</TableCell></TableRow>; })}
      {pageOrders.length === 0 && <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No marketplace orders match these filters.</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex items-center justify-between text-sm"><span>Page {safePage} of {totalPages}</span><div className="flex gap-2"><Button asChild variant="outline" size="sm" disabled={safePage <= 1}><Link href={pageHref(Math.max(1, safePage - 1))}>Previous</Link></Button><Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}><Link href={pageHref(Math.min(totalPages, safePage + 1))}>Next</Link></Button></div></div>
  </div>;
}
