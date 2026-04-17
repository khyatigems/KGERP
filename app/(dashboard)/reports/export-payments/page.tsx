"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, DollarSign } from "lucide-react";

interface PaymentReport {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  invoice: {
    number?: string;
    type?: string;
    currency?: string;
    conversionRate?: number;
  };
}

interface PaymentData {
  summary: {
    totalUsdPayments: number;
    totalInrEquivalent: number;
    paymentCount: number;
    paymentMethods: Array<{
      method: string;
      currency: string;
      amount: number;
      count: number;
    }>;
  };
  paymentsByDate: Array<{
    date: string;
    payments: PaymentReport[];
    totalAmount: number;
  }>;
}

export default function ExportPaymentsPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPaymentData = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports/payments/export?${params}`);
      if (!response.ok) throw new Error("Failed to fetch payment data");
      
      const data = await response.json();
      setPaymentData(data);
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      setLoading(true);
      fetchPaymentData();
    }
  }, [startDate, endDate]);

  const exportToCSV = () => {
    if (!paymentData) return;

    const csvContent = [
      ["Date", "Invoice Number", "Payment Method", "Amount (USD)", "Amount (INR)", "Reference", "Notes"],
      ...paymentData.paymentsByDate.flatMap(day =>
        day.payments.map(payment => [
          day.date,
          payment.invoice.number || "",
          payment.method,
          payment.amount.toString(),
          (payment.amount * 83).toString(), // Using average conversion rate
          payment.reference || "",
          payment.notes || "",
        ])
      ),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-payments-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading export payment data...</div>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">
          Failed to load payment data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Export Payment Reports</h1>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total USD Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paymentData.summary.totalUsdPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {paymentData.summary.paymentCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">INR Equivalent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paymentData.summary.totalInrEquivalent)}</div>
            <p className="text-xs text-muted-foreground">
              At average conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentData.summary.paymentMethods.map((method, index) => (
                <div key={index} className="flex justify-between items-center">
                  <Badge variant="outline">{method.method}</Badge>
                  <span className="text-sm">
                    {method.currency === "USD" ? "$" : "₹"}{method.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>INR Equivalent</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentData.paymentsByDate.flatMap(day =>
                day.payments.map((payment, index) => (
                  <TableRow key={`${day.date}-${index}`}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.invoice.number}</div>
                        <Badge variant="outline" className="text-xs">
                          {payment.invoice.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.method}</Badge>
                    </TableCell>
                    <TableCell>
                      {payment.invoice.currency === "USD" ? (
                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                      ) : (
                        formatCurrency(payment.amount)
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.invoice.currency === "USD" ? (
                        formatCurrency(payment.amount * (payment.invoice.conversionRate || 83))
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{payment.reference}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
