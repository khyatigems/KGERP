"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface MarketplaceOrderItemRow {
  id: string;
  listedSku: string | null;
  listedTitle: string | null;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
  fulfillmentSku: string | null;
  status: string | null;
}

export interface MarketplaceOrderRow {
  id: string;
  marketplace: string;
  marketplaceOrderId: string;
  orderNumber: string | null;
  marketplaceShopName: string | null;
  status: string | null;
  buyerName: string | null;
  buyerCountry: string | null;
  buyerCity: string | null;
  trackingCode: string | null;
  carrier: string | null;
  orderTotal: number | null;
  currency: string | null;
  orderDate: Date | string | null;
  items: MarketplaceOrderItemRow[];
}

function statusVariant(status: string | null): "default" | "secondary" | "outline" {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "PAID", "SHIPPED", "OPEN", "FULFILLED"].includes(s)) return "default";
  if (["CANCELLED", "REFUNDED", "FAILED"].includes(s)) return "secondary";
  return "outline";
}

export function MarketplaceOrdersTable({ data }: { data: MarketplaceOrderRow[] }) {
  const itemCount = data.reduce((n, o) => n + o.items.length, 0);
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {data.length} marketplace order{data.length === 1 ? "" : "s"} · {itemCount} line item{itemCount === 1 ? "" : "s"}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No marketplace orders synced yet. Use "Sync Orders".
                </TableCell>
              </TableRow>
            ) : (
              data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell><Badge variant="secondary">{order.marketplace}</Badge></TableCell>
                  <TableCell>{order.marketplaceShopName || "—"}</TableCell>
                  <TableCell className="font-mono">{order.orderNumber || order.marketplaceOrderId}</TableCell>
                  <TableCell>
                    <div className="text-sm">{order.buyerName || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[order.buyerCity, order.buyerCountry].filter(Boolean).join(", ") || ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.items.length} item{order.items.length === 1 ? "" : "s"}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.items.map((i) => i.listedSku || i.listedTitle || "—").join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {order.orderTotal != null ? formatCurrency(order.orderTotal, order.currency || "USD") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(order.status)}>{order.status || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {order.trackingCode ? (
                        <>
                          <div className="font-mono">{order.trackingCode}</div>
                          <div className="text-muted-foreground">{order.carrier || ""}</div>
                        </>
                      ) : "—"}
                    </div>
                  </TableCell>
                  <TableCell>{order.orderDate ? formatDate(order.orderDate) : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

