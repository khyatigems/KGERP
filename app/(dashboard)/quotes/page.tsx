import { Metadata } from "next";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuotesCardList } from "@/components/quotes/quotes-card-list";

export const metadata: Metadata = {
  title: "Quotations | KhyatiGems™",
};

export default async function QuotationsPage() {
  const quotes = await prisma.quotation.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Link>
        </Button>
      </div>

      <div className="md:hidden">
        <QuotesCardList data={quotes} />
      </div>

      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No quotations found.
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    {quote.quotationNumber}
                  </TableCell>
                  <TableCell>{formatDate(quote.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{quote.customerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {quote.customerMobile}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{quote._count.items}</TableCell>
                  <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{formatDate(quote.expiryDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/quote/${quote.token}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
