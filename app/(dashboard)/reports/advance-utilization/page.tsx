"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, Search, Receipt } from "lucide-react";
import Link from "next/link";

interface AdvanceUtilization {
  adjustmentId: string;
  advanceId: string;
  customerId: string;
  customerName: string;
  saleId: string;
  invoiceNumber: string;
  amountUsed: number;
  advanceAmount: number;
  originalAdvanceDate: string;
  adjustmentDate: string;
}

export default function AdvanceUtilizationReportPage() {
  const [data, setData] = useState<AdvanceUtilization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/advance-utilization");
        const result = await res.json();
        if (result.success) {
          setData(result.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter(
    (item) =>
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUtilized = filteredData.reduce((sum, item) => sum + item.amountUsed, 0);

  const handleExport = () => {
    const csv = [
      ["Customer Name", "Invoice Number", "Advance Amount", "Amount Used", "Adjustment Date", "Original Advance Date"],
      ...filteredData.map((item) => [
        item.customerName,
        item.invoiceNumber || "",
        item.advanceAmount.toString(),
        item.amountUsed.toString(),
        formatDate(item.adjustmentDate),
        formatDate(item.originalAdvanceDate),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advance-utilization-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Advance Utilization Report</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Utilized</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUtilized)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or invoice number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead className="text-right">Amount Used</TableHead>
                  <TableHead className="text-right">Original Advance</TableHead>
                  <TableHead>Adjustment Date</TableHead>
                  <TableHead>Original Advance Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No utilization data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.adjustmentId}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${item.customerId}`} className="hover:underline">
                          {item.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {item.invoiceNumber ? (
                          <Link href={`/sales/${item.saleId}`} className="hover:underline">
                            {item.invoiceNumber}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amountUsed)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.advanceAmount)}
                      </TableCell>
                      <TableCell>{formatDate(item.adjustmentDate)}</TableCell>
                      <TableCell>{formatDate(item.originalAdvanceDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
