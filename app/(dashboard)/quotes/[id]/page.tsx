import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink, ShoppingCart } from "lucide-react";
import { QuotationActions } from "@/components/quotes/quotation-actions";

export const metadata: Metadata = {
  title: "Quote Details | KhyatiGems™",
};

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const quote = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: {
          include: {
             // We need to check if the item is already sold to disable the button
             // But QuotationItem doesn't link to Sale directly. Inventory does.
             // Wait, QuotationItem has inventoryId.
          }
      }
    },
  });

  if (!quote) notFound();

  // Fetch current inventory status for items in the quote
  const inventoryIds = quote.items.map(i => i.inventoryId);
  const inventoryItems = await prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, status: true, sku: true }
  });

  const inventoryStatusMap = inventoryItems.reduce((acc, item) => {
      acc[item.id] = item.status;
      return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Quote {quote.quotationNumber}
        </h1>
        <Badge
          variant={
            quote.status === "ACTIVE"
              ? "default"
              : quote.status === "CONVERTED"
              ? "secondary"
              : "outline"
          }
        >
          {quote.status}
        </Badge>
        <QuotationActions id={quote.id} status={quote.status} items={quote.items} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-md border p-6 bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Customer Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{quote.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile</span>
              <span className="font-medium">{quote.customerMobile || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{quote.customerEmail || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium">{quote.customerCity || "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-md border p-6 bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Quote Info</h3>
          <div className="space-y-2 text-sm">
             <div className="flex justify-between">
              <span className="text-muted-foreground">Created Date</span>
              <span className="font-medium">{formatDate(quote.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date</span>
              <span className="font-medium">{formatDate(quote.expiryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">{formatCurrency(quote.totalAmount)}</span>
            </div>
            <div className="pt-4 flex justify-end">
                 <Button variant="outline" size="sm" asChild>
                  <Link href={`/quote/${quote.token}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Public Link
                  </Link>
                </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="p-6 border-b">
             <h3 className="font-semibold text-lg">Items</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Quoted Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quote.items.map((item) => {
              const currentStatus = inventoryStatusMap[item.inventoryId] || "UNKNOWN";
              const isSold = currentStatus === "SOLD";

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.weight}</TableCell>
                  <TableCell>{formatCurrency(item.quotedPrice)}</TableCell>
                  <TableCell>
                      <Badge variant={isSold ? "secondary" : "default"}>
                          {currentStatus}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSold && (
                        <Button size="sm" asChild>
                            <Link href={`/sales/new?inventoryId=${item.inventoryId}&quoteId=${quote.id}`}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Sell
                            </Link>
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
