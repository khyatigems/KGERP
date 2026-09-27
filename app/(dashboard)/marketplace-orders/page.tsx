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

  const [shops, orders] = await Promise.all([
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
  ]);

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
                <TableCell>{order.items.length} · {order.items.map((item) => item.listedSku || item.listedTitle || "—").join(", ")}</TableCell>
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