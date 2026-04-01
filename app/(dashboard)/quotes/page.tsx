import { Metadata } from "next";
import Link from "next/link";
import { Plus, Wallet, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
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
import { auth } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Quotations | KhyatiGems™",
};

export default async function QuotationsPage() {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";
  const canCreate = hasPermission(userRole, PERMISSIONS.QUOTATION_CREATE);

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

  const now = new Date();
  const getDisplayStatus = (quote: { status: string; expiryDate: Date | null }) => {
    const exp = quote.expiryDate;
    if (!exp) return quote.status;
    const expTime = exp instanceof Date ? exp.getTime() : new Date(exp).getTime();
    if (Number.isNaN(expTime)) return quote.status;
    const isExpired = expTime < now.getTime();
    const expirable = ["SENT", "PENDING_APPROVAL", "APPROVED", "ACCEPTED", "ACTIVE"].includes(quote.status);
    if (isExpired && expirable) return "EXPIRED";
    return quote.status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canCreate && (
          <>
            <Button asChild variant="outline" className="mr-2">
              <Link href="/advances">
                <Wallet className="mr-2 h-4 w-4" />
                Record Advance
              </Link>
            </Button>
            <Button asChild>
              <LoadingLink href="/quotes/new">
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </LoadingLink>
            </Button>
          </>
        )}
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
                (() => {
                  const displayStatus = getDisplayStatus({ status: quote.status, expiryDate: quote.expiryDate });
                  return (
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
                        ["SENT", "APPROVED", "ACCEPTED", "ACTIVE", "CONVERTED"].includes(displayStatus) ? "default" :
                        ["EXPIRED", "CANCELLED"].includes(displayStatus) ? "destructive" :
                        "secondary"
                      }
                      className={
                        displayStatus === "PENDING_APPROVAL" ? "bg-amber-500 hover:bg-amber-600 text-white" :
                        displayStatus === "APPROVED" ? "bg-green-600 hover:bg-green-700" :
                        displayStatus === "ACCEPTED" ? "bg-teal-600 hover:bg-teal-700" :
                        displayStatus === "CONVERTED" ? "bg-indigo-600 hover:bg-indigo-700" :
                        undefined
                      }
                    >
                      {displayStatus === "CONVERTED" ? "INVOICED" : displayStatus.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{quote.expiryDate ? formatDate(quote.expiryDate) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/quotes/${quote.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                  );
                })()
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
