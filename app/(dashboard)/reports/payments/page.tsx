import { prisma } from "@/lib/prisma";
import { PaymentAnalytics } from "@/components/reports/payment-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PaymentReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  const payments = await prisma.payment.findMany({
    where: {
      date: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          quotation: {
            select: {
              customerName: true,
              customer: { select: { name: true } }
            }
          },
          sales: {
            select: {
              customerName: true,
              customer: { select: { name: true } }
            },
            take: 1
          }
        }
      }
    },
    orderBy: {
      date: "desc",
    },
  });

  // Aggregate Data
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPayments = payments.length;

  // Monthly Trend
  const monthlyTrendMap = new Map<string, { amount: number; count: number }>();
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyTrendMap.set(monthKey, { amount: 0, count: 0 });
  }

  payments.forEach((p) => {
    const monthKey = format(p.date, "MMM yyyy");
    // Ensure the key exists in case of date mismatch (though initialized above)
    // If payment date is outside the initialized range (unlikely with query), it will be skipped or added.
    // Given the query filters by date, it should be fine.
    if (monthlyTrendMap.has(monthKey)) {
        const current = monthlyTrendMap.get(monthKey)!;
        monthlyTrendMap.set(monthKey, {
        amount: current.amount + p.amount,
        count: current.count + 1,
        });
    }
  });

  const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Method Distribution
  const methodMap = new Map<string, number>();
  payments.forEach((p) => {
    const method = p.method || "UNKNOWN";
    methodMap.set(method, (methodMap.get(method) || 0) + p.amount);
  });
  
  const methodDistribution = Array.from(methodMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Recent Payments Table Data
  const recentPayments = payments.map(p => {
    let customerName = "Unknown Customer";
    if (p.invoice.quotation?.customer?.name) {
      customerName = p.invoice.quotation.customer.name;
    } else if (p.invoice.quotation?.customerName) {
      customerName = p.invoice.quotation.customerName;
    } else if (p.invoice.sales?.[0]?.customer?.name) {
      customerName = p.invoice.sales[0].customer.name;
    } else if (p.invoice.sales?.[0]?.customerName) {
      customerName = p.invoice.sales[0].customerName;
    }

    return {
      id: p.id,
      date: p.date,
      invoiceNumber: p.invoice.invoiceNumber,
      customerName,
      amount: p.amount,
      method: p.method,
      notes: p.notes
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Payment Reports</h1>
      <PaymentAnalytics data={{
        totalReceived,
        totalPayments,
        recentPayments,
        monthlyTrend,
        methodDistribution
      }} />
    </div>
  );
}
