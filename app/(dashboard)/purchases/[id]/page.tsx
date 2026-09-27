import Link from "next/link";
import { Pencil, Activity, CalendarDays, CreditCard, Hash, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePurchaseAction } from "../actions";
import { AnimatedPage } from "@/components/ui/animated-page";

type PurchasePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseDetailPage({
  params,
}: PurchasePageProps) {
  const { id: purchaseId } = await params;

  if (!purchaseId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Purchase</h1>
        <p className="text-sm text-muted-foreground">
          Invalid purchase id in the URL.
        </p>
      </div>
    );
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      vendor: {
        select: { name: true },
      },
      purchaseItems: true,
      payments: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!purchase) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Purchase</h1>
        <p className="text-sm text-muted-foreground">
          Purchase not found. It may have been deleted or the link is invalid.
        </p>
      </div>
    );
  }

  // Define logs variable to avoid ReferenceError
  // Using explicit type to match the expected structure in JSX
  let logs: {
    id: string;
    entityType: string | null;
    actionType: string | null;
    entityIdentifier: string | null;
    userName: string | null;
    createdAt: Date;
    source: string | null;
    fieldChanges: string | null;
  }[] = [];

  try {
    const activityClient = (prisma as typeof prisma & {
      activityLog?: {
        findMany: (args: { where: { OR: Array<{ entityType: string; entityId: string } | { entityType: string; entityIdentifier: string }> }; orderBy: { createdAt: string } }) => Promise<typeof logs>;
      };
    }).activityLog;
    
    if (activityClient) {
        logs = await activityClient.findMany({
            where: {
                OR: [
                  { entityType: "Purchase", entityId: purchaseId },
                  { entityType: "Purchase", entityIdentifier: purchase.invoiceNo || "" },
                ],
            },
            orderBy: { createdAt: "desc" },
        });
    }
  } catch (error) {
    console.error("Failed to fetch purchase activity logs:", error);
    // Fallback to empty logs if table is missing or other DB error
    logs = [];
  }

  const totalCost = purchase.totalAmount || purchase.purchaseItems.reduce(
    (sum: number, item) => sum + item.totalCost,
    0
  );
  const paidAmount = purchase.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingAmount = Math.max(0, totalCost - paidAmount);

  return (
    <AnimatedPage>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Purchase Details
          </h1>
          <p className="text-sm text-muted-foreground">
            Purchase {purchase.invoiceNo || "Not set"} ·{" "}
            {formatDate(purchase.purchaseDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/purchases/${purchase.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <form>
            <input type="hidden" name="id" value={purchase.id} />
            <Button 
              variant="destructive" 
              size="sm"
              formAction={deletePurchaseAction}
            >
              Delete
            </Button>
          </form>
          <Button variant="outline" asChild>
            <Link href="/purchases">Back to Purchases</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow">
          <h2 className="text-sm font-medium text-muted-foreground">
            Vendor
          </h2>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {purchase.vendor?.name || "Unknown"}
          </p>
        </div>
        <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow">
          <h2 className="text-sm font-medium text-muted-foreground">
            Payment
          </h2>
          {/* <p className="text-sm">
            Mode: {purchase.paymentMode || "Not set"}
          </p> */}
          <p className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Status:{" "}
            <Badge variant="outline">
              {purchase.paymentStatus || "PENDING"}
            </Badge>
          </p>
        </div>
        <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow">
          <h2 className="text-sm font-medium text-muted-foreground">
            Totals
          </h2>
          <p className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid to vendor</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(outstandingAmount)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment entries</p>
          <p className="mt-1 text-xl font-semibold">{purchase.payments.length}</p>
        </div>
      </div>

      {purchase.payments.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Vendor Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference / Cheque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell><Badge variant="outline">{payment.method.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference || payment.chequeNumber || "-"}
                      {payment.method === "CHEQUE" && payment.bankName ? ` · ${payment.bankName}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-card-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-600">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Purchase reference</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{purchase.invoiceNo || "Not assigned"}</p>
          </div>
          <Badge className="ml-auto" variant="outline">Read-only record</Badge>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Shape</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.purchaseItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell>{item.shape || "-"}</TableCell>
                  <TableCell>
                    {item.dimensions || (item.beadSizeMm ? `${item.beadSizeMm} mm` : "-")}
                  </TableCell>
                  <TableCell>
                    {item.weightValue} {item.weightUnit}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(item.unitCost)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(item.totalCost)}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-pre-line text-muted-foreground">{item.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {purchase.notes && purchase.notes.trim().length > 0 && (
        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Remarks
          </h2>
          <p className="text-sm whitespace-pre-line">
            {purchase.notes}
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Activity Timeline</h2>
        </div>
        <div className="p-4 space-y-4">
            {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
                logs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            log.actionType === 'CREATE' ? 'bg-green-500' :
                            log.actionType === 'EDIT' ? 'bg-primary' :
                            log.actionType === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{log.userName || "System"}</span> {(log.actionType || "UPDATED").toLowerCase()} this purchase
                              {log.source && log.source !== 'WEB' && <span className="text-xs text-muted-foreground ml-2">via {log.source}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {log.createdAt.toLocaleString()}
                            </p>
                            {log.fieldChanges && (
                                <div className="text-xs bg-muted p-2 rounded mt-1 font-mono">
                                    Changes: {Object.keys(JSON.parse(log.fieldChanges)).join(", ")}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
    </AnimatedPage>
  );
}
