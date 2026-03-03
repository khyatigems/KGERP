import { prisma } from "@/lib/prisma";
import { PaymentAnalytics } from "@/components/reports/payment-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PaymentReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // Fetch payments without relation to avoid "Inconsistent query result" error
  // if orphan payments exist (invalid invoiceId).
  const payments = await prisma.payment.findMany({
    where: {
      date: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Manually fetch invoices to handle potential orphans gracefully
  const invoiceIds = [...new Set(payments.map(p => p.invoiceId))];
  
  const invoices = await prisma.invoice.findMany({
    where: {
      id: { in: invoiceIds }
    },
    select: {
      id: true,
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
  });

  const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]));

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
    const invoice = invoiceMap.get(p.invoiceId);
    let customerName = "Unknown Customer";
    let invoiceNumber = "N/A";

    if (invoice) {
        invoiceNumber = invoice.invoiceNumber;
        if (invoice.quotation?.customer?.name) {
            customerName = invoice.quotation.customer.name;
        } else if (invoice.quotation?.customerName) {
            customerName = invoice.quotation.customerName;
        } else if (invoice.sales?.[0]?.customer?.name) {
            customerName = invoice.sales[0].customer.name;
        } else if (invoice.sales?.[0]?.customerName) {
            customerName = invoice.sales[0].customerName;
        }
    } else {
        invoiceNumber = "ORPHAN (Missing Invoice)";
    }

    return {
      id: p.id,
      date: p.date,
      invoiceNumber: invoiceNumber,
      customerName: customerName,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
    };
  });

  const analyticsData = {
    totalReceived,
    totalPayments,
    monthlyTrend,
    methodDistribution,
    recentPayments,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Payment Reports</h1>
      <PaymentAnalytics data={analyticsData} />
    </div>
  );
}
