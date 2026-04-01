"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, Search, Clock } from "lucide-react";
import Link from "next/link";

interface PendingAdvance {
  advanceId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  originalAmount: number;
  remainingAmount: number;
  adjustedAmount: number;
  paymentMode: string;
  notes: string | null;
  createdAt: string;
  daysSinceCreation: number;
}

export default function PendingAdvancesReportPage() {
  const [data, setData] = useState<PendingAdvance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/pending-advances");
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

  const totalPending = filteredData.reduce((sum, item) => sum + item.remainingAmount, 0);
  const totalOriginal = filteredData.reduce((sum, item) => sum + item.originalAmount, 0);

  // Group by age
  const lessThan30Days = filteredData.filter((item) => item.daysSinceCreation < 30);
  const between30And90Days = filteredData.filter((item) => item.daysSinceCreation >= 30 && item.daysSinceCreation < 90);
  const moreThan90Days = filteredData.filter((item) => item.daysSinceCreation >= 90);

  const handleExport = () => {
    const csv = [
      ["Customer Name", "Phone", "Original Amount", "Remaining Amount", "Used Amount", "Payment Mode", "Created Date", "Days Pending"],
      ...filteredData.map((item) => [
        item.customerName,
        item.customerPhone || "",
        item.originalAmount.toString(),
        item.remainingAmount.toString(),
        item.adjustedAmount.toString(),
        item.paymentMode,
        formatDate(item.createdAt),
        item.daysSinceCreation.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending-advances-${new Date().toISOString().split("T")[0]}.csv`;
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
        <h1 className="text-2xl font-bold">Pending Advance Adjustment Report</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">advances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Original</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOriginal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0
                ? Math.round(filteredData.reduce((sum, item) => sum + item.daysSinceCreation, 0) / filteredData.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>

      {/* Age Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">&lt; 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{lessThan30Days.length}</div>
            <p className="text-xs text-green-600">
              {formatCurrency(lessThan30Days.reduce((sum, item) => sum + item.remainingAmount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">30 - 90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{between30And90Days.length}</div>
            <p className="text-xs text-amber-600">
              {formatCurrency(between30And90Days.reduce((sum, item) => sum + item.remainingAmount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">&gt; 90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{moreThan90Days.length}</div>
            <p className="text-xs text-red-600">
              {formatCurrency(moreThan90Days.reduce((sum, item) => sum + item.remainingAmount, 0))}
            </p>
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
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Days Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No pending advances found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.advanceId}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${item.customerId}`} className="hover:underline">
                          {item.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>{item.customerPhone || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.originalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.adjustedAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatCurrency(item.remainingAmount)}
                      </TableCell>
                      <TableCell>{item.paymentMode}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.daysSinceCreation > 90 ? "destructive" : item.daysSinceCreation > 30 ? "default" : "secondary"}
                        >
                          {item.daysSinceCreation} days
                        </Badge>
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
