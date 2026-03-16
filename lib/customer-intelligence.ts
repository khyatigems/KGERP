import { prisma } from "@/lib/prisma";

type CustomerAggregate = {
  key: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalPurchases: number;
  totalAmount: number;
  avgTicketSize: number;
  lastPurchaseAt: Date;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function customerKey(input: { customerId: string | null; customerEmail: string | null; customerPhone: string | null; customerName: string | null }) {
  if (input.customerId) return `id:${input.customerId}`;
  if (input.customerEmail) return `email:${input.customerEmail.trim().toLowerCase()}`;
  if (input.customerPhone) return `phone:${normalizePhone(input.customerPhone)}`;
  return `name:${(input.customerName || "Unknown").trim().toLowerCase()}`;
}

export async function getCustomerIntelligence(days = 365) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: { gte: from },
      OR: [
        { customerId: { not: null } },
        { customerEmail: { not: null } },
        { customerPhone: { not: null } },
        { customerName: { not: null } },
      ]
    },
    orderBy: { saleDate: "desc" },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      saleDate: true,
      netAmount: true,
      inventory: { select: { sku: true, itemName: true } }
    }
  });

  const map = new Map<string, CustomerAggregate>();
  for (const sale of sales) {
    const key = customerKey(sale);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        customerName: sale.customerName || "Unknown",
        customerEmail: sale.customerEmail || "",
        customerPhone: sale.customerPhone || "",
        totalPurchases: 1,
        totalAmount: sale.netAmount || 0,
        avgTicketSize: sale.netAmount || 0,
        lastPurchaseAt: sale.saleDate,
      });
    } else {
      existing.totalPurchases += 1;
      existing.totalAmount += sale.netAmount || 0;
      existing.avgTicketSize = existing.totalAmount / existing.totalPurchases;
      if (sale.saleDate > existing.lastPurchaseAt) existing.lastPurchaseAt = sale.saleDate;
    }
  }

  const customers = Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const repeatCustomers = customers.filter((c) => c.totalPurchases >= 2);
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalTransactions = customers.reduce((sum, c) => sum + c.totalPurchases, 0);

  return {
    summary: {
      uniqueCustomers: customers.length,
      repeatCustomers: repeatCustomers.length,
      repeatRate: customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0,
      avgTicketSize: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      totalRevenue,
      totalTransactions,
    },
    topCustomers: customers.slice(0, 20),
    repeatCustomers: repeatCustomers.slice(0, 20),
    purchaseTimeline: sales.slice(0, 30).map((sale) => ({
      id: sale.id,
      customerName: sale.customerName || "Unknown",
      customerPhone: sale.customerPhone || "",
      customerEmail: sale.customerEmail || "",
      sku: sale.inventory.sku,
      itemName: sale.inventory.itemName,
      netAmount: sale.netAmount || 0,
      saleDate: sale.saleDate,
    }))
  };
}
