import { prisma } from "@/lib/prisma";
import { getConnector } from "@/lib/marketplace/connectors";
import { startSyncLog, finalizeSyncLog, failSyncLog } from "@/lib/marketplace/sync-log";
import type { MarketplacePlatform } from "@/lib/marketplace/types";

function safeJson(value: unknown): string | null {
  try {
    return value == null ? null : JSON.stringify(value);
  } catch {
    return null;
  }
}

export interface OrderSyncResult {
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Idempotent marketplace order sync. Uses (marketplace, marketplaceOrderId) as
 * the idempotency key so re-running the sync never duplicates orders or items.
 */
export async function syncOrdersForPlatform(
  platform: MarketplacePlatform,
  params: { from?: string; limit?: number; offset?: number } = {}
): Promise<OrderSyncResult> {
  const connector = getConnector(platform);
  if (!connector) throw new Error(`No connector registered for ${platform}`);

  const logId = await startSyncLog(platform, "ORDERS");
  const counters = { scanned: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

  try {
    const orders = await connector.fetchOrders(params);
    counters.scanned = orders.length;

    for (const order of orders) {
      if (!order.orderId) {
        counters.skipped += 1;
        continue;
      }
      try {
        const existing = await prisma.marketplaceOrder.findUnique({
          where: {
            marketplace_marketplaceOrderId: {
              marketplace: order.marketplace,
              marketplaceOrderId: order.orderId,
            },
          },
        });

        const orderData = {
          marketplace: order.marketplace,
          marketplaceOrderId: order.orderId,
          orderNumber: order.orderNumber,
          marketplaceShopName: order.shopName ?? null,
          status: order.status || "IMPORTED",
          buyerName: order.buyerName ?? null,
          buyerEmail: order.buyerEmail ?? null,
          buyerCountry: order.buyerCountry ?? null,
          buyerCity: order.buyerCity ?? null,
          buyerState: order.buyerState ?? null,
          buyerZip: order.buyerZip ?? null,
          trackingCode: order.trackingCode ?? null,
          carrier: order.carrier ?? null,
          orderTotal: order.orderTotal,
          currency: order.currency || "USD",
          orderDate: order.orderDate,
          rawMetadata: safeJson(order.raw),
          lastSyncedAt: new Date(),
        };

        let orderId: string;
        if (existing) {
          orderId = existing.id;
          await prisma.marketplaceOrder.update({ where: { id: existing.id }, data: orderData });
          counters.updated += 1;
        } else {
          const created = await prisma.marketplaceOrder.create({ data: orderData });
          orderId = created.id;
          counters.created += 1;
        }

        for (const item of order.items) {
          const itemId = item.itemId;
          const where = itemId
            ? { orderId_marketplaceItemId: { orderId, marketplaceItemId: itemId } }
            : undefined;

          if (!where) {
            counters.skipped += 1;
            continue;
          }

          const itemData = {
            orderId,
            marketplaceItemId: itemId,
            listedSku: item.sku,
            listedTitle: item.title,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            currency: item.currency || order.currency || "USD",
            rawMetadata: safeJson(item.raw),
          };

          const existingItem = await prisma.marketplaceOrderItem.findUnique({ where });
          if (existingItem) {
            await prisma.marketplaceOrderItem.update({ where: { id: existingItem.id }, data: itemData });
          } else {
            await prisma.marketplaceOrderItem.create({ data: itemData });
          }
        }
      } catch (error) {
        counters.failed += 1;
        console.error(`[sync-orders] failed for ${platform} ${order.orderId}:`, error);
      }
    }

    await finalizeSyncLog(logId, {
      status: counters.failed > 0 ? "PARTIAL" : "SUCCESS",
      counters,
    });
    return counters;
  } catch (error) {
    await failSyncLog(logId, error);
    throw error;
  }
}
