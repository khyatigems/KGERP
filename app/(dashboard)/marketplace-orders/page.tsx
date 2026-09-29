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

export default async function MarketplaceOrdersPage() {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();

  const [shops, orders, syncJobs] = await Promise.all([
    prisma.marketplaceShop.findMany({
      where: { status: "CONNECTED", connection: { status: "CONNECTED" } },
      select: { id: true, marketplace: true, name: true },
      orderBy: [{ marketplace: "asc" }, { name: "asc" }],
    }),
    prisma.marketplaceOrder.findMany({
      orderBy: { orderDate: "desc" },
      take: 500,
      include: { marketplaceShop: { select: { name: true } }, items: true },
    }),
    prisma.marketplaceSyncJob.findMany({
      where: { syncType: "ORDERS", status: { in: ["SUCCESS", "PARTIAL"] }, endedAt: { not: null } },
      orderBy: { endedAt: "desc" }, take: 100,
      select: { marketplaceShopId: true, endedAt: true },
    }),
  ]);
  const lastSyncByShop = new Map<string, Date>();
  for (const job of syncJobs) if (!lastSyncByShop.has(job.marketplaceShopId) && job.endedAt) lastSyncByShop.set(job.marketplaceShopId, job.endedAt);
  const orderImage = (raw: string | null) => {
    try {
      const value = JSON.parse(raw || "{}");
      return typeof value.imageUrl === "string" ? value.imageUrl : typeof value.image?.imageUrl === "string" ? value.image.imageUrl : null;
    } catch { return null; }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace Orders</h1>
          <p className="text-sm text-muted-foreground">Orders imported from connected marketplace shops.</p>
        </div>
        <Button asChild variant="outline"><Link href="/marketplace-listings">Marketplace Listings</Link></Button>
      </div>

      <MarketplaceSyncPanel shops={shops} syncType="ORDERS" />

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {shops.map((shop) => <div key={shop.id} className="rounded-md border px-3 py-2"><strong>{shop.marketplace} · {shop.name}</strong> · Last orders sync: {lastSyncByShop.get(shop.id)?.toLocaleString() || "Not yet synced"}</div>)}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>External Order ID</TableHead>
            <TableHead>Order number</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead>
            <TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Last synced</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.marketplace}</TableCell>
                <TableCell>{order.marketplaceShop?.name || order.marketplaceShopName || "Legacy"}</TableCell>
                <TableCell className="font-mono text-xs">{order.marketplaceOrderId}</TableCell>
                <TableCell>{order.orderNumber || "—"}</TableCell>
                <TableCell>{order.buyerName || "—"}</TableCell>
                <TableCell><div className="space-y-1">{order.items.map((item) => <div key={item.id} className="flex items-center gap-2">{orderImage(item.rawMetadata) ? <img src={orderImage(item.rawMetadata)!} alt="Order item" className="h-9 w-9 rounded object-cover" /> : null}<span>{item.listedSku || item.listedTitle || "—"}</span></div>)}</div></TableCell>
                <TableCell>{order.orderTotal != null ? `${order.currency} ${order.orderTotal}` : "—"}</TableCell>
                <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                <TableCell>{order.orderDate?.toLocaleString() || "—"}</TableCell>
                <TableCell>{order.lastSyncedAt?.toLocaleString() || "—"}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No marketplace orders synced yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
