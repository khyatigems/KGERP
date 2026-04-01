"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getCustomerLoyaltyLedger, LoyaltyLedgerEntry } from "@/app/(dashboard)/customers/actions";
import Link from "next/link";

interface CustomerLoyaltyLedgerProps {
  customerId: string;
  customerName: string;
}

export function CustomerLoyaltyLedger({ customerId, customerName }: CustomerLoyaltyLedgerProps) {
  const [entries, setEntries] = useState<LoyaltyLedgerEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCustomerLoyaltyLedger(customerId);
      if (result.success) {
        setEntries(result.entries);
        setTotalPoints(result.totalPoints);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch loyalty ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "EARN":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Earned</Badge>;
      case "REDEEM":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">Redeemed</Badge>;
      case "ADJUST":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Adjusted</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "EARN":
      case "ADJUST":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "REDEEM":
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const formatPoints = (points: number, type: string) => {
    const isPositive = type === "EARN" || type === "ADJUST";
    const sign = isPositive ? "+" : "-";
    return `${sign}${Math.abs(points).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchLedger}
            className="text-sm text-blue-600 hover:underline flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Loyalty Points Ledger</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Transaction history for {customerName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold">{totalPoints.toFixed(2)} pts</p>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No loyalty points transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Value (₹)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(entry.type)}
                        {getTypeBadge(entry.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.invoiceNumber ? (
                        <Link
                          href={`/invoices/${entry.invoiceId}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {entry.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={entry.type === "EARN" || entry.type === "ADJUST" ? "text-green-600" : "text-orange-600"}>
                        {formatPoints(entry.points, entry.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{entry.rupeeValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {entry.runningBalance.toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.remarks || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
