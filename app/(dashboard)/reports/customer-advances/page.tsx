"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, Search, Wallet } from "lucide-react";
import Link from "next/link";

interface CustomerAdvanceBalance {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalAdvances: number;
  totalReceived: number;
  totalUsed: number;
  totalRemaining: number;
  lastAdvanceDate: string | null;
}

export default function CustomerAdvanceBalanceReportPage() {
  const [data, setData] = useState<CustomerAdvanceBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/customer-advance-balance");
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
      (item.customerPhone || "").includes(searchTerm)
  );

  const totalReceived = filteredData.reduce((sum, item) => sum + item.totalReceived, 0);
  const totalUsed = filteredData.reduce((sum, item) => sum + item.totalUsed, 0);
  const totalRemaining = filteredData.reduce((sum, item) => sum + item.totalRemaining, 0);

  const handleExport = () => {
    const csv = [
      ["Customer Name", "Phone", "Total Advances", "Total Received", "Total Used", "Total Remaining", "Last Advance Date"],
      ...filteredData.map((item) => [
        item.customerName,
        item.customerPhone || "",
        item.totalAdvances.toString(),
        item.totalReceived.toString(),
        item.totalUsed.toString(),
        item.totalRemaining.toString(),
        item.lastAdvanceDate ? formatDate(item.lastAdvanceDate) : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-advance-balance-${new Date().toISOString().split("T")[0]}.csv`;
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
        <h1 className="text-2xl font-bold">Customer Advance Balance Report</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUsed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or phone..."
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
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Advances</TableHead>
                  <TableHead className="text-right">Total Received</TableHead>
                  <TableHead className="text-right">Total Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Last Advance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${item.customerId}`} className="hover:underline">
                          {item.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>{item.customerPhone || "-"}</TableCell>
                      <TableCell className="text-right">{item.totalAdvances}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalReceived)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalUsed)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(item.totalRemaining)}
                      </TableCell>
                      <TableCell>
                        {item.lastAdvanceDate ? formatDate(item.lastAdvanceDate) : "-"}
                      </TableCell>
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
