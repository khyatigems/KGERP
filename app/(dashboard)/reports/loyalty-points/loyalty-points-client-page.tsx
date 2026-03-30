"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-range-picker";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatInrNumber } from "@/lib/utils";
import { getLoyaltyPointsReport } from "./actions";

interface LoyaltyPointsClientPageProps {
  initialReport: Awaited<ReturnType<typeof getLoyaltyPointsReport>>;
}

export default function LoyaltyPointsClientPage({ initialReport }: LoyaltyPointsClientPageProps) {
  const [report, setReport] = useState(initialReport);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialReport.startDate,
    to: initialReport.endDate,
  });
  const [isPending, startTransition] = useTransition();

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const fetchReport = () => {
    if (!dateRange?.from || !dateRange.to) {
      toast.error("Please select a valid date range.");
      return;
    }

    startTransition(async () => {
      const fetchedReport = await getLoyaltyPointsReport(dateRange.from!, dateRange.to!);
      setReport(fetchedReport);
      toast.success("Report refreshed successfully.");
    });
  };

  // No need for useEffect to fetch on mount here, as initialReport is already provided.
  // The parent Server Component will handle the initial data fetch.
  // This useEffect was causing an extra fetch on client-side mount, which is not ideal.
  // If dateRange changes and user clicks 'Generate Report', fetchReport will be called.

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Loyalty Points Report</CardTitle>
          <div className="flex items-center space-x-2">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
            <Button onClick={fetchReport} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Earned Points</p>
                <p className="text-2xl font-bold">{formatInrNumber(report.summary.totalEarnedPoints)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Redeemed Points</p>
                <p className="text-2xl font-bold">{formatInrNumber(report.summary.totalRedeemedPoints)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Redeemed Value</p>
                <p className="text-2xl font-bold">{formatCurrency(report.summary.totalRedeemedValue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Net Points (Earned - Redeemed)</p>
                <p className="text-2xl font-bold">{formatInrNumber(report.summary.netPoints)}</p>
              </Card>
            </div>
          ) : (
            <p>Select a date range and generate the report.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {report?.details && report.details.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Rupee Value</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead className="text-right">Invoice Discount</TableHead>
                    <TableHead className="text-right">Profit on Invoice</TableHead>
                    <TableHead className="text-right">Profit - Loyalty/Discount</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.details.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.createdAt), "PPP p")}</TableCell>
                      <TableCell>{entry.type}</TableCell>
                      <TableCell>{entry.customerName}</TableCell>
                      <TableCell>{entry.invoiceNumber || "N/A"}</TableCell>
                      <TableCell className="text-right">{formatInrNumber(entry.points)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.rupeeValue)}</TableCell>
                      <TableCell className="text-right">{entry.invoiceTotalAmount !== null ? formatCurrency(entry.invoiceTotalAmount) : "N/A"}</TableCell>
                      <TableCell className="text-right">{entry.invoiceDiscountTotal !== null ? formatCurrency(entry.invoiceDiscountTotal) : "N/A"}</TableCell>
                      <TableCell className="text-right">{entry.totalProfitOnInvoice !== null ? formatCurrency(entry.totalProfitOnInvoice) : "N/A"}</TableCell>
                      <TableCell className="text-right">{entry.profitMinusLoyaltyAndDiscount !== null ? formatCurrency(entry.profitMinusLoyaltyAndDiscount) : "N/A"}</TableCell>
                      <TableCell>{entry.remarks || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No loyalty point transactions found for the selected date range.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
