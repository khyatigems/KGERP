import { prisma } from "@/lib/prisma";

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(input: Date, days: number) {
  return new Date(input.getTime() + days * 24 * 60 * 60 * 1000);
}

function diffDays(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}

function ageBucket(daysInStock: number) {
  if (daysInStock <= 30) return "0-30";
  if (daysInStock <= 60) return "31-60";
  if (daysInStock <= 90) return "61-90";
  if (daysInStock <= 180) return "91-180";
  return "180+";
}

async function generateDailySnapshot(snapshotDate: Date) {
  const dayStart = startOfUtcDay(snapshotDate);
  const dayEnd = addUtcDays(dayStart, 1);

  const inventoryInStock = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: { id: true, costPrice: true, sellingPrice: true }
  });

  const salesOfDay = await prisma.sale.findMany({
    where: { saleDate: { gte: dayStart, lt: dayEnd } },
    select: { id: true, netAmount: true, salePrice: true, profit: true }
  });

  const invoices = await prisma.invoice.findMany({
    where: { isActive: true },
    select: { id: true, paymentStatus: true }
  });

  const paymentsOfDay = await prisma.payment.findMany({
    where: { date: { gte: dayStart, lt: dayEnd } },
    select: { amount: true }
  });

  const inventoryCount = inventoryInStock.length;
  const inventoryValueCost = inventoryInStock.reduce((sum, item) => sum + (item.costPrice || 0), 0);
  const inventoryValueSell = inventoryInStock.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
  const salesCount = salesOfDay.length;
  const salesRevenue = salesOfDay.reduce((sum, sale) => sum + (sale.netAmount || sale.salePrice || 0), 0);
  const profitAmount = salesOfDay.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const invoiceCount = invoices.length;
  const pendingInvoices = invoices.filter((invoice) => invoice.paymentStatus !== "PAID").length;
  const paymentReceived = paymentsOfDay.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  await prisma.analyticsDailySnapshot.upsert({
    where: { snapshotDate: dayStart },
    create: {
      snapshotDate: dayStart,
      inventoryCount,
      inventoryValueCost,
      inventoryValueSell,
      salesCount,
      salesRevenue,
      profitAmount,
      invoiceCount,
      pendingInvoices,
      paymentReceived,
    },
    update: {
      inventoryCount,
      inventoryValueCost,
      inventoryValueSell,
      salesCount,
      salesRevenue,
      profitAmount,
      invoiceCount,
      pendingInvoices,
      paymentReceived,
    }
  });
}

async function refreshInventorySnapshot(referenceDate: Date) {
  const inventory = await prisma.inventory.findMany({
    select: {
      id: true,
      sku: true,
      itemName: true,
      category: true,
      costPrice: true,
      sellingPrice: true,
      status: true,
      createdAt: true,
      vendor: { select: { name: true } }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.analyticsInventorySnapshot.deleteMany({});
    if (inventory.length === 0) return;
    await tx.analyticsInventorySnapshot.createMany({
      data: inventory.map((item) => {
        const daysInStock = diffDays(item.createdAt, referenceDate);
        return {
          inventoryId: item.id,
          sku: item.sku,
          itemName: item.itemName,
          category: item.category || "Uncategorized",
          vendorName: item.vendor?.name || "Unknown",
          purchaseCost: item.costPrice || 0,
          sellingPrice: item.sellingPrice || 0,
          daysInStock,
          status: item.status || "UNKNOWN",
          ageBucket: ageBucket(daysInStock),
        };
      })
    });
  });
}

async function refreshVendorSnapshot(snapshotDate: Date) {
  const dayStart = startOfUtcDay(snapshotDate);
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      purchases: { select: { totalAmount: true, purchaseDate: true } },
      inventories: { select: { status: true, costPrice: true } }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.analyticsVendorSnapshot.deleteMany({ where: { snapshotDate: dayStart } });
    if (vendors.length === 0) return;
    await tx.analyticsVendorSnapshot.createMany({
      data: vendors.map((vendor) => {
        const totalItemsSupplied = vendor.inventories.length;
        const totalPurchaseValue = vendor.purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
        const inventoryInStock = vendor.inventories.filter((item) => item.status === "IN_STOCK").length;
        const inventoryValue = vendor.inventories
          .filter((item) => item.status === "IN_STOCK")
          .reduce((sum, item) => sum + (item.costPrice || 0), 0);
        const latestPurchase = vendor.purchases
          .slice()
          .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())[0]?.purchaseDate;

        return {
          vendorId: vendor.id,
          snapshotDate: dayStart,
          vendorName: vendor.name,
          totalItemsSupplied,
          totalPurchaseValue,
          inventoryInStock,
          inventoryValue,
          lastPurchaseDate: latestPurchase || null,
        };
      })
    });
  });
}

async function refreshSalesSnapshot() {
  const sales = await prisma.sale.findMany({
    select: {
      id: true,
      saleDate: true,
      salePrice: true,
      netAmount: true,
      costPriceSnapshot: true,
      profit: true,
      inventory: {
        select: {
          sku: true,
          itemName: true,
          category: true,
          createdAt: true,
          costPrice: true
        }
      }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.analyticsSalesSnapshot.deleteMany({});
    if (sales.length === 0) return;
    await tx.analyticsSalesSnapshot.createMany({
      data: sales.map((sale) => {
        const purchaseCost = sale.costPriceSnapshot || sale.inventory.costPrice || 0;
        return {
          saleId: sale.id,
          sku: sale.inventory.sku || "-",
          itemName: sale.inventory.itemName || "-",
          category: sale.inventory.category || "Uncategorized",
          purchaseCost,
          sellingPrice: sale.netAmount || sale.salePrice || 0,
          profitAmount: sale.profit || ((sale.netAmount || sale.salePrice || 0) - purchaseCost),
          saleDate: sale.saleDate,
          saleCycleDays: diffDays(sale.inventory.createdAt, sale.saleDate),
        };
      })
    });
  });
}

async function refreshLabelSnapshot() {
  const jobs = await prisma.labelPrintJob.findMany({
    select: {
      id: true,
      createdAt: true,
      totalItems: true,
      user: { select: { name: true, email: true } }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.analyticsLabelSnapshot.deleteMany({});
    if (jobs.length === 0) return;
    await tx.analyticsLabelSnapshot.createMany({
      data: jobs.map((job) => ({
        jobId: job.id,
        printedBy: job.user.name || job.user.email || "Unknown",
        labelsPrinted: job.totalItems || 0,
        printedAt: job.createdAt,
      }))
    });
  });
}

export async function runDailyAnalyticsSnapshots(runDate = new Date()) {
  await generateDailySnapshot(runDate);
  await refreshInventorySnapshot(runDate);
  await refreshVendorSnapshot(runDate);
  await refreshSalesSnapshot();
  await refreshLabelSnapshot();
  return { ok: true, runDate: runDate.toISOString() };
}
