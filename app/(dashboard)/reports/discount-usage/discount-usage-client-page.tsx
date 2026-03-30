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
import { getDiscountUsageReport } from "./actions";

interface DiscountUsageClientPageProps {
  initialReport: Awaited<ReturnType<typeof getDiscountUsageReport>>;
}

export default function DiscountUsageClientPage({ initialReport }: DiscountUsageClientPageProps) {
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
      const fetchedReport = await getDiscountUsageReport(dateRange.from!, dateRange.to!);
      setReport(fetchedReport);
      toast.success("Report refreshed successfully.");
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Discount Usage Report</CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Discount Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(report.summary.totalDiscountAmount)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Invoices with Discount</p>
                <p className="text-2xl font-bold">{formatInrNumber(report.summary.totalInvoicesWithDiscount)}</p>
              </Card>
            </div>
          ) : (
            <p>Select a date range and generate the report.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Discount Redemptions</CardTitle>
        </CardHeader>
        <CardContent>
          {report?.details && report.details.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Coupon Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Max Discount</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Discount Amount</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead className="text-right">Profit on Invoice</TableHead>
                    <TableHead className="text-right">Profit After Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.details.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.redeemedAt), "PPP p")}</TableCell>
                      <TableCell>{entry.couponCode}</TableCell>
                      <TableCell>{entry.couponType}</TableCell>
                      <TableCell>{entry.couponValue}{entry.couponType === "PERCENT" ? "%" : ""}</TableCell>
                      <TableCell>{entry.couponMaxDiscount !== null ? formatCurrency(entry.couponMaxDiscount) : "N/A"}</TableCell>
                      <TableCell>{entry.customerName || "N/A"}</TableCell>
                      <TableCell>{entry.invoiceNumber}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.discountAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.invoiceTotalAmount)}</TableCell>
                      <TableCell className="text-right">{entry.totalProfitOnInvoice !== null ? formatCurrency(entry.totalProfitOnInvoice) : "N/A"}</TableCell>
                      <TableCell className="text-right">{entry.profitAfterDiscount !== null ? formatCurrency(entry.profitAfterDiscount) : "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No discount redemptions found for the selected date range.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
