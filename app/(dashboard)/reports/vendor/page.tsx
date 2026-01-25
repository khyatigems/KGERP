import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client-custom-v2";
import { VendorReportClient } from "@/components/reports/vendor-report-client";
import { startOfMonth, subMonths, format } from "date-fns";

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

  // 2. Fetch Overview Data (Global)
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  const activeVendorsCount = vendors.length;

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

  // Aggregate Overview Data
  let totalSpend = 0;
  const totalPurchases = allPurchases.length;
  
  const monthlySpendMap = new Map<string, { spend: number; count: number }>();
  const vendorSpendMap = new Map<string, { spend: number; count: number }>();

  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlySpendMap.set(monthKey, { spend: 0, count: 0 });
  }

  allPurchases.forEach((purchase) => {
    // Calculate total from items to ensure accuracy or use purchase.totalAmount
    // Using purchase.totalAmount as it's the invoice total
    const purchaseTotal = purchase.totalAmount; 
    totalSpend += purchaseTotal;

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

  const overviewData = {
    totalSpend,
    activeVendors: activeVendorsCount,
    totalPurchases,
    monthlySpend,
    topVendors,
  };

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
      // Create vendor map for quick lookup
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

      // Report 1: Vendor Inventory Level
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
      // Report 2: Vendor Purchase Point
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

      // Flatten items for the report
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
          totalAmount: i.totalCost, // Line item amount
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
