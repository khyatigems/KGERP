import { prisma } from "@/lib/prisma";

export async function getInvoiceOrderReferences(invoiceIds: string[]) {
  const ids = [...new Set(invoiceIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string>();

  const sales = await prisma.sale.findMany({
    where: {
      OR: [
        { invoiceId: { in: ids } },
        { legacyInvoiceId: { in: ids } },
      ],
    },
    orderBy: { saleDate: "asc" },
    select: {
      invoiceId: true,
      legacyInvoiceId: true,
      orderId: true,
      marketplaceOrderItemId: true,
    },
  });
  const itemIds = [...new Set(sales.map((sale) => sale.marketplaceOrderItemId).filter((id): id is string => Boolean(id)))];
  const marketplaceItems = itemIds.length
    ? await prisma.marketplaceOrderItem.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          order: { select: { orderNumber: true, marketplaceOrderId: true } },
        },
      })
    : [];
  const marketplaceOrders = new Map(marketplaceItems.map((item) => [
    item.id,
    item.order.orderNumber?.trim() || item.order.marketplaceOrderId.trim(),
  ]));
  const result = new Map<string, string>();
  for (const sale of sales) {
    const invoiceId = sale.invoiceId || sale.legacyInvoiceId;
    if (!invoiceId || result.has(invoiceId)) continue;
    const marketplaceNumber = sale.marketplaceOrderItemId
      ? marketplaceOrders.get(sale.marketplaceOrderItemId)
      : null;
    const orderNumber = marketplaceNumber || sale.orderId?.trim();
    if (orderNumber) result.set(invoiceId, orderNumber);
  }
  return result;
}

export async function getInvoiceOrderReference(invoiceId: string): Promise<string | null> {
  const references = await getInvoiceOrderReferences([invoiceId]);
  return references.get(invoiceId) ?? null;
}
