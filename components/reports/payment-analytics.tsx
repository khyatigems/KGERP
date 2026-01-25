"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface PaymentData {
  totalReceived: number;
  totalPayments: number;
  recentPayments: {
    id: string;
    date: Date;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    method: string;
    notes: string | null;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
    count: number;
  }[];
  methodDistribution: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function PaymentAnalytics({ data }: { data: PaymentData }) {
  
  // Export functionality for Payment Reports
  const exportToExcel = () => {
    // 1. Prepare Summary Data
    const summaryData = [
      ["Payment Summary Report"],
      ["Generated on", format(new Date(), "dd MMM yyyy HH:mm")],
      [],
      ["Total Received", data.totalReceived],
      ["Total Payments", data.totalPayments],
      [],
    ];

    // 2. Prepare Detailed Data
    const headers = ["Date", "Invoice #", "Customer", "Method", "Notes", "Amount"];
    const rows = data.recentPayments.map(p => [
      format(p.date, "dd MMM yyyy"),
      p.invoiceNumber,
      p.customerName,
      p.method,
      p.notes || "-",
      p.amount
    ]);

    // 3. Create Workbook and Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...summaryData, headers, ...rows]);

    // Format columns width
    ws['!cols'] = [
      { wch: 15 }, // Date
      { wch: 15 }, // Invoice
      { wch: 20 }, // Customer
      { wch: 15 }, // Method
      { wch: 30 }, // Notes
      { wch: 15 }  // Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, `Payment_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Payment Summary Report", 14, 20);
    
    // Meta info
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 30);

    // Summary Cards
    doc.setFontSize(12);
    doc.text("Summary", 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Received', formatCurrency(data.totalReceived)],
        ['Total Payments', data.totalPayments.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 }
    });

    // Detailed Table
    const lastY = (doc as any).lastAutoTable.finalY || 50;
    doc.text("Payment History", 14, lastY + 10);

    const tableRows = data.recentPayments.map(p => [
      format(p.date, "dd MMM yyyy"),
      p.invoiceNumber,
      p.customerName,
      p.method.replace('_', ' '),
      p.notes || "-",
      formatCurrency(p.amount)
    ]);

    autoTable(doc, {
      startY: lastY + 15,
      head: [['Date', 'Invoice #', 'Customer', 'Method', 'Notes', 'Amount']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });

    doc.save(`Payment_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={exportToPDF}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(Number(value) || 0)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" name="Received" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.methodDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.methodDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | string | Array<number | string> | undefined) => formatCurrency(Number(value) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(payment.date, "dd MMM yyyy")}</TableCell>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>{payment.customerName}</TableCell>
                    <TableCell className="capitalize">{payment.method.toLowerCase().replace('_', ' ')}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={payment.notes || ""}>{payment.notes || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
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
