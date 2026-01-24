import { prisma } from "@/lib/prisma";
import { QuotationAnalytics } from "@/components/reports/quotation-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function QuotationReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // 1. Fetch Quotations (Last 6 Months for trend, but total stats should maybe be overall? 
  // Let's do overall for KPIs and trend for chart)
  
  // Fetch ALL for status distribution and KPIs
  const allQuotations = await prisma.quotation.findMany({
    select: {
      status: true,
      createdAt: true,
    },
  });

  // 2. Aggregate Data
  const totalQuotations = allQuotations.length;
  const acceptedCount = allQuotations.filter(q => q.status === "ACCEPTED" || q.status === "CONVERTED" || q.status === "APPROVED").length;
  const pendingCount = allQuotations.filter(q => q.status === "SENT" || q.status === "PENDING_APPROVAL" || q.status === "DRAFT" || q.status === "ACTIVE").length;
  const conversionRate = totalQuotations > 0 ? (acceptedCount / totalQuotations) * 100 : 0;

  // Status Distribution
  const statusMap = new Map<string, number>();
  allQuotations.forEach(q => {
    statusMap.set(q.status, (statusMap.get(q.status) || 0) + 1);
  });

  const statusDistribution = Array.from(statusMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly Created (Last 6 Months)
  const monthlyCreatedMap = new Map<string, number>();
  
  // Initialize
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyCreatedMap.set(monthKey, 0);
  }

  allQuotations.forEach(q => {
    if (q.createdAt >= sixMonthsAgo) {
      const monthKey = format(q.createdAt, "MMM yyyy");
      if (monthlyCreatedMap.has(monthKey)) {
        monthlyCreatedMap.set(monthKey, (monthlyCreatedMap.get(monthKey) || 0) + 1);
      }
    }
  });

  const monthlyCreated = Array.from(monthlyCreatedMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  const analyticsData = {
    totalQuotations,
    conversionRate,
    acceptedCount,
    pendingCount,
    statusDistribution,
    monthlyCreated,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Quotation Analytics</h1>
      <QuotationAnalytics data={analyticsData} />
    </div>
  );
}
