import { prisma } from "@/lib/prisma";
import { InvoiceAnalytics } from "@/components/reports/invoice-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function InvoiceReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // 1. Fetch Invoices with Sales (Last 6 Months)
  // We fetch Invoices to count them, and Sales to sum values.
  // Note: An invoice can have multiple sales.
  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      sales: {
        select: {
          netAmount: true,
          paymentStatus: true,
        },
      },
      legacySale: {
        select: {
            netAmount: true,
            paymentStatus: true,
        }
      }
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // 2. Aggregate Data
  let totalValue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  
  // Status Counts
  let paidCount = 0;
  let unpaidCount = 0;
  let partialCount = 0;

  // Monthly Trend
  const monthlyDataMap = new Map<string, { value: number; count: number }>();
  
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyDataMap.set(monthKey, { value: 0, count: 0 });
  }

  invoices.forEach((invoice) => {
    // Invoice Total
    // Check if we have multiple sales linked (new way) or a legacy single sale
    let invoiceTotal = 0;
    let invoicePaid = 0;
    let isPaid = false;
    let isPartial = false;
    // let isUnpaid = false;

    if (invoice.sales && invoice.sales.length > 0) {
        // Multi-sale invoice
        invoiceTotal = invoice.sales.reduce((sum, sale) => sum + sale.netAmount, 0);
        invoicePaid = invoice.sales.reduce((sum, sale) => {
            if (sale.paymentStatus === "PAID") return sum + sale.netAmount;
            return sum;
        }, 0);
        
        isPaid = invoice.sales.every(s => s.paymentStatus === "PAID");
        isPartial = invoice.sales.some(s => s.paymentStatus === "PARTIAL") || (invoicePaid > 0 && invoicePaid < invoiceTotal);
        // isUnpaid = !isPaid && !isPartial;
    } else if (invoice.legacySale) {
        // Legacy single sale invoice
        invoiceTotal = invoice.legacySale.netAmount;
        if (invoice.legacySale.paymentStatus === "PAID") {
            invoicePaid = invoiceTotal;
            isPaid = true;
        } else if (invoice.legacySale.paymentStatus === "PARTIAL") {
            // If partial amount isn't tracked, we can't know exact paid amount.
            // Assuming 0 for now unless we add a field for partial payment.
            // Or maybe we count it as 0 but status is partial.
            invoicePaid = 0; 
            isPartial = true;
        } else {
            // isUnpaid = true;
        }
    }

    totalValue += invoiceTotal;
    totalPaid += invoicePaid;
    
    if (isPaid) paidCount++;
    else if (isPartial) partialCount++;
    else if (invoiceTotal > 0) unpaidCount++; // Only count as unpaid if there's a value (avoid empty invoices counting as unpaid)


    // Monthly Trend
    const monthKey = format(invoice.createdAt, "MMM yyyy");
    const current = monthlyDataMap.get(monthKey) || { value: 0, count: 0 };
    monthlyDataMap.set(monthKey, {
      value: current.value + invoiceTotal,
      count: current.count + 1,
    });
  });

  totalOutstanding = totalValue - totalPaid;

  const monthlyCreated = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
    month,
    value: data.value,
    count: data.count,
  }));

  const statusDistribution = [
    { name: "Paid", value: paidCount },
    { name: "Unpaid", value: unpaidCount },
    { name: "Partial", value: partialCount },
  ].filter(d => d.value > 0);

  const analyticsData = {
    totalInvoices: invoices.length,
    totalValue,
    totalPaid,
    totalOutstanding,
    statusDistribution,
    monthlyCreated,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Invoice Analytics</h1>
      <InvoiceAnalytics data={analyticsData} />
    </div>
  );
}
