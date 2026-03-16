import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string; paymentId: string }>;
};

export default async function PaymentReceiptPage({ params }: Props) {
  const { id, paymentId } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          sales: {
            take: 1,
            orderBy: { saleDate: "desc" }
          }
        }
      }
    }
  });

  if (!payment || payment.invoiceId !== id) notFound();

  const customerName = payment.invoice.sales[0]?.customerName || "Customer";

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="border rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold">Payment Receipt</h1>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-muted-foreground">Receipt ID</div>
          <div className="font-mono">{payment.id}</div>
          <div className="text-muted-foreground">Invoice</div>
          <div>{payment.invoice.invoiceNumber}</div>
          <div className="text-muted-foreground">Customer</div>
          <div>{customerName}</div>
          <div className="text-muted-foreground">Payment Date</div>
          <div>{formatDate(payment.date)}</div>
          <div className="text-muted-foreground">Method</div>
          <div>{payment.method}</div>
          <div className="text-muted-foreground">Reference</div>
          <div>{payment.reference || "-"}</div>
          <div className="text-muted-foreground">Amount</div>
          <div className="font-bold">{formatCurrency(payment.amount)}</div>
          <div className="text-muted-foreground">Recorded By</div>
          <div>{payment.recordedBy || "-"}</div>
        </div>
      </div>
    </div>
  );
}
