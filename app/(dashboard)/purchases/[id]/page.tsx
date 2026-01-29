import Link from "next/link";
import { Pencil, Activity } from "lucide-react";
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
import { updatePurchaseInvoice, deletePurchaseAction } from "../actions";

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
    entityType: string;
    actionType: string;
    entityIdentifier: string;
    userName: string | null;
    timestamp: Date;
    source: string;
    fieldChanges: string | null;
  }[] = [];

  try {
    const activityClient = (prisma as typeof prisma & {
      activityLog?: {
        findMany: (args: { where: { entityType: string; entityId: string }; orderBy: { timestamp: string } }) => Promise<typeof logs>;
      };
    }).activityLog;
    
    if (activityClient) {
        logs = await activityClient.findMany({
            where: {
                entityType: "Purchase",
                entityId: purchaseId
            },
            orderBy: { timestamp: "desc" },
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

  async function updateInvoiceAction(formData: FormData) {
    "use server";
    await updatePurchaseInvoice(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Purchase Details
          </h1>
          <p className="text-sm text-muted-foreground">
            Invoice {purchase.invoiceNo || "Not set"} ·{" "}
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
          <p className="text-lg font-semibold">
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
          <p className="text-sm">
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
          <p className="text-2xl font-bold">
            {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 text-card-foreground shadow">
        <h2 className="mb-4 text-lg font-semibold">
          Invoice Number
        </h2>
        <form action={updateInvoiceAction} className="flex flex-wrap items-end gap-4">
          <input
            type="hidden"
            name="purchaseId"
            value={purchase.id}
          />
          <div className="space-y-2">
            <label
              htmlFor="invoiceNo"
              className="text-sm font-medium"
            >
              Invoice No
            </label>
            <input
              id="invoiceNo"
              name="invoiceNo"
              defaultValue={purchase.invoiceNo || ""}
              placeholder="KGP-0001"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Button type="submit">
            Save
          </Button>
        </form>
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
                            log.actionType === 'EDIT' ? 'bg-blue-500' :
                            log.actionType === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">{log.userName}</span> {log.actionType.toLowerCase()}d this purchase
                                {log.source !== 'WEB' && <span className="text-xs text-muted-foreground ml-2">via {log.source}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {log.timestamp.toLocaleString()}
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
  );
}
