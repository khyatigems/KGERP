"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

type Expense = {
    id: string;
    expenseDate: Date;
    description: string;
    totalAmount: number;
    // gstAmount: number | null;
    paymentMode: string;
    vendorName: string | null;
    category: {
        name: string;
    };
};

interface ExpensesReportViewProps {
    expenses: Expense[];
    categoryStats: Record<string, { count: number, amount: number }>;
    vendorStats: Record<string, { count: number, amount: number }>;
    paymentModeStats: Record<string, { count: number, amount: number }>;
    gstTotal: number;
}

export function ExpensesReportView({
    expenses,
    categoryStats,
    vendorStats,
    paymentModeStats,
    gstTotal
}: ExpensesReportViewProps) {

    const handleExport = () => {
        // Prepare data for export
        const exportData = expenses.map(e => ({
            Date: format(new Date(e.expenseDate), "yyyy-MM-dd"),
            Category: e.category.name,
            Description: e.description,
            Vendor: e.vendorName || "-",
            "Payment Mode": e.paymentMode,
            // "GST Amount": e.gstAmount || 0,
            "Total Amount": e.totalAmount
        }));

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: Detailed Expenses
        const wsDetails = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, wsDetails, "All Expenses");

        // Sheet 2: Category Summary
        const categoryData = Object.entries(categoryStats).map(([cat, stats]) => ({
            Category: cat,
            Count: stats.count,
            "Total Amount": stats.amount
        }));
        const wsCategory = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(wb, wsCategory, "Category Summary");

        // Sheet 3: Vendor Summary
        const vendorData = Object.entries(vendorStats).map(([ven, stats]) => ({
            Vendor: ven,
            Count: stats.count,
            "Total Amount": stats.amount
        }));
        const wsVendor = XLSX.utils.json_to_sheet(vendorData);
        XLSX.utils.book_append_sheet(wb, wsVendor, "Vendor Summary");

        // Save file
        XLSX.writeFile(wb, `Expense_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Expense Reports</h1>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export Report (Excel)
                </Button>
            </div>

            {/* Category Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Category-wise Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(categoryStats).map(([cat, stats]) => (
                                <TableRow key={cat}>
                                    <TableCell>{cat}</TableCell>
                                    <TableCell className="text-right">{stats.count}</TableCell>
                                    <TableCell className="text-right">₹{stats.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Vendor Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Vendor-wise Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(vendorStats).map(([vendor, stats]) => (
                                <TableRow key={vendor}>
                                    <TableCell>{vendor}</TableCell>
                                    <TableCell className="text-right">{stats.count}</TableCell>
                                    <TableCell className="text-right">₹{stats.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Payment Mode Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Mode Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mode</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(paymentModeStats).map(([mode, stats]) => (
                                <TableRow key={mode}>
                                    <TableCell>{mode}</TableCell>
                                    <TableCell className="text-right">{stats.count}</TableCell>
                                    <TableCell className="text-right">₹{stats.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* GST Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>GST Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Total GST Paid: ₹{gstTotal.toLocaleString()}</div>
                </CardContent>
            </Card>
        </div>
    );
}
