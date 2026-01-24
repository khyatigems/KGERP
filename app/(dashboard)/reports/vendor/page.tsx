import { prisma } from "@/lib/prisma";
import { VendorAnalytics } from "@/components/reports/vendor-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function VendorReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // 1. Fetch Vendors
  const activeVendorsCount = await prisma.vendor.count({
    where: { status: "APPROVED" },
  });

  // 2. Fetch Purchases (Last 6 Months)
  const purchases = await prisma.purchase.findMany({
    where: {
      purchaseDate: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      items: true,
      vendor: {
        select: { name: true },
      },
    },
    orderBy: {
      purchaseDate: "asc",
    },
  });

  // 3. Aggregate Purchase Data
  let totalSpend = 0;
  const totalPurchases = purchases.length;
  
  // Monthly Trend
  const monthlySpendMap = new Map<string, { spend: number; count: number }>();
  // Top Vendors Map
  const vendorSpendMap = new Map<string, { spend: number; count: number }>();

  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlySpendMap.set(monthKey, { spend: 0, count: 0 });
  }

  purchases.forEach((purchase) => {
    const purchaseTotal = purchase.items.reduce((sum, item) => sum + item.costPrice, 0);
    totalSpend += purchaseTotal;

    // Monthly
    const monthKey = format(purchase.purchaseDate, "MMM yyyy");
    const currentMonth = monthlySpendMap.get(monthKey) || { spend: 0, count: 0 };
    monthlySpendMap.set(monthKey, {
      spend: currentMonth.spend + purchaseTotal,
      count: currentMonth.count + 1,
    });

    // Vendor
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

  const analyticsData = {
    totalSpend,
    activeVendors: activeVendorsCount,
    totalPurchases,
    monthlySpend,
    topVendors,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Vendor Reports</h1>
      <VendorAnalytics data={analyticsData} />
    </div>
  );
}
