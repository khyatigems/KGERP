import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSalesReportData } from "@/lib/sales-reporting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    // Get sales reporting data which includes payment method breakdown
    const salesData = await getSalesReportData(startDate, endDate);

    // Filter for export payment methods (PayPal, Payoneer) and USD transactions
    const exportPayments = salesData.salesByPaymentMethod.filter(
      payment => 
        (payment.method === "PAYPAL" || payment.method === "PAYONEER") || 
        payment.currency === "USD"
    );

    // Get detailed payment records for export invoices
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const payments = await prisma.payment.findMany({
      where: {
        ...where,
        OR: [
          { method: "PAYPAL" },
          { method: "PAYONEER" },
        ],
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            invoiceType: true,
            invoiceCurrency: true,
            conversionRate: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Group payments by date and method
    const paymentsByDate = new Map<string, Array<typeof payments[0]>>();
    for (const payment of payments) {
      const dateKey = payment.date.toISOString().split('T')[0];
      if (!paymentsByDate.has(dateKey)) {
        paymentsByDate.set(dateKey, []);
      }
      paymentsByDate.get(dateKey)!.push(payment);
    }

    // Calculate totals
    const totalUsdPayments = exportPayments
      .filter(p => p.currency === "USD")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalInrEquivalent = exportPayments
      .filter(p => p.currency === "USD")
      .reduce((sum, p) => sum + (p.amount * 83), 0); // Using average conversion rate, could be improved

    return NextResponse.json({
      summary: {
        totalUsdPayments,
        totalInrEquivalent,
        paymentCount: exportPayments.reduce((sum, p) => sum + p.count, 0),
        paymentMethods: exportPayments.map(p => ({
          method: p.method,
          currency: p.currency,
          amount: p.amount,
          count: p.count,
        })),
      },
      paymentsByDate: Array.from(paymentsByDate.entries()).map(([date, dayPayments]) => ({
        date,
        payments: dayPayments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          invoice: {
            number: payment.invoice?.invoiceNumber,
            type: payment.invoice?.invoiceType,
            currency: payment.invoice?.invoiceCurrency,
            conversionRate: payment.invoice?.conversionRate,
          },
        })),
        totalAmount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
      })),
      rawPayments: payments,
    });
  } catch (error) {
    console.error("Error fetching export payment reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch export payment reports" },
      { status: 500 }
    );
  }
}
