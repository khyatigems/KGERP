import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client-custom-v2";
import { VendorReportClient } from "@/components/reports/vendor-report-client";
import { startOfMonth, subMonths, format } from "date-fns";
import { AnalyticsData } from "@/components/reports/vendor-analytics";

export const dynamic = "force-dynamic";

export default async function VendorReportPage({
  searchParams,
}: {
  searchParams: { vendorId?: string; type?: string; from?: string; to?: string };
}) {
  const { vendorId, type = "inventory", from, to } = searchParams;

  // 1. Fetch Vendors for Dropdown
  const vendors = await prisma.vendor.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 2. Fetch Overview Data based on Type
  let overviewData: AnalyticsData;

  if (type === "inventory") {
    // Inventory Overview Logic
    const allInventory = await prisma.inventory.findMany({
      where: {
        status: { in: ["IN_STOCK", "MEMO"] }
      },
      select: {
        id: true,
        costPrice: true,
        category: true,
        vendorId: true,
        vendor: { select: { name: true } }
      }
    });

    const totalItems = allInventory.length;
    const totalValue = allInventory.reduce((sum, item) => sum + (item.costPrice || 0), 0);
    
    // Category Distribution
    const categoryMap = new Map<string, number>();
    allInventory.forEach(item => {
      const cat = item.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top Vendors by Stock Value
    const vendorValueMap = new Map<string, number>();
    const activeVendorSet = new Set<string>();

    allInventory.forEach(item => {
      if (item.vendorId) {
        activeVendorSet.add(item.vendorId);
        const vName = item.vendor?.name || "Unknown";
        vendorValueMap.set(vName, (vendorValueMap.get(vName) || 0) + (item.costPrice || 0));
      }
    });

    const topVendorsByValue = Array.from(vendorValueMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    overviewData = {
      type: "inventory",
      totalItems,
      totalValue,
      activeVendors: activeVendorSet.size,
      categoryDistribution,
      topVendorsByValue
    };

  } else {
    // Purchase Overview Logic (Default)
    const today = new Date();
    const sixMonthsAgo = startOfMonth(subMonths(today, 5));

    const allPurchases = await prisma.purchase.findMany({
      where: {
        purchaseDate: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        vendor: {
          select: { name: true },
        },
      },
      orderBy: {
        purchaseDate: "asc",
      },
    });

    let totalSpend = 0;
    const totalPurchases = allPurchases.length;
    const monthlySpendMap = new Map<string, { spend: number; count: number }>();
    const vendorSpendMap = new Map<string, { spend: number; count: number }>();
    const activeVendorSet = new Set<string>();

    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(today, 5 - i);
      const monthKey = format(monthDate, "MMM yyyy");
      monthlySpendMap.set(monthKey, { spend: 0, count: 0 });
    }

    allPurchases.forEach((purchase) => {
      const purchaseTotal = purchase.totalAmount; 
      totalSpend += purchaseTotal;

      if (purchase.vendorId) activeVendorSet.add(purchase.vendorId);

      const monthKey = format(purchase.purchaseDate, "MMM yyyy");
      const currentMonth = monthlySpendMap.get(monthKey) || { spend: 0, count: 0 };
      monthlySpendMap.set(monthKey, {
        spend: currentMonth.spend + purchaseTotal,
        count: currentMonth.count + 1,
      });

      const vendorName = purchase.vendor?.name || "Unknown Vendor";
      const currentVendor = vendorSpendMap.get(vendorName) || { spend: 0, count: 0 };
      vendorSpendMap.set(vendorName, {
        spend: currentVendor.spend + purchaseTotal,
        count: currentVendor.count + 1,
      });
    });

    const monthlySpend = Array.from(monthlySpendMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    const topVendors = Array.from(vendorSpendMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    overviewData = {
      type: "purchase",
      totalSpend,
      activeVendors: activeVendorSet.size, // Use actual active purchase vendors
      totalPurchases,
      monthlySpend,
      topVendors,
    };
  }

  // 3. Fetch Specific Report Data (if vendorId selected)
  let reportData = null;

  if (vendorId) {
    const isAll = vendorId === "all";
    const vendorIds = isAll ? [] : vendorId.split(",");
    const vendorFilter = isAll ? {} : { id: { in: vendorIds } };
    
    // Fetch vendor names for the header
    const selectedVendors = await prisma.vendor.findMany({
      where: vendorFilter,
      select: { name: true },
    });

    const vendorLabel = isAll 
        ? "All Vendors" 
        : selectedVendors.length === 1 
            ? selectedVendors[0].name 
            : `${selectedVendors.length} Vendors Selected`;

    if (type === "inventory") {
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      const items = await prisma.inventory.findMany({
        where: { 
          ...(isAll ? {} : { vendorId: { in: vendorIds } }),
          status: { in: ["IN_STOCK", "MEMO"] }
        },
        orderBy: { createdAt: "desc" },
      });

      reportData = {
        vendorName: vendorLabel,
        items: items.map(i => ({
            ...i,
            vendorName: i.vendorId ? vendorMap.get(i.vendorId) || "Unknown" : "-"
        })),
        summary: {
          totalItems: items.length,
          totalCarats: items.reduce((sum, i) => sum + (i.carats || 0), 0),
          totalValue: items.reduce((sum, i) => sum + (i.costPrice || 0), 0),
        },
      };
    } else {
      // Purchase Report Data
      const dateFilter: Prisma.DateTimeFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);

      const purchases = await prisma.purchase.findMany({
        where: {
          ...(isAll ? {} : { vendorId: { in: vendorIds } }),
          ...(from || to ? { purchaseDate: dateFilter } : {}),
        },
        include: { 
            purchaseItems: true,
            vendor: { select: { name: true } }
        },
        orderBy: { purchaseDate: "desc" },
      });

      const flatItems = purchases.flatMap((p) =>
        p.purchaseItems.map((i) => ({
          date: p.purchaseDate,
          invoiceNo: p.invoiceNo || "-",
          vendorName: p.vendor?.name || "Unknown",
          itemName: i.itemName,
          weight: i.weightValue,
          shape: i.shape,
          category: i.category,
          purchasePrice: i.totalCost,
          totalAmount: i.totalCost,
        }))
      );

      reportData = {
        vendorName: vendorLabel,
        items: flatItems,
        summary: {
          totalCount: purchases.length,
          totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
        },
      };
    }
  }

  return (
    <VendorReportClient 
      vendors={vendors} 
      overviewData={overviewData} 
      reportData={reportData} 
    />
  );
}
