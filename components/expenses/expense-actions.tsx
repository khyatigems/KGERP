"use client";

import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { importExpensesFromCSV } from "@/app/(dashboard)/expenses/actions";
import { type ExpenseImportRow } from "@/app/(dashboard)/expenses/schema";
import { Loader2 } from "lucide-react";

interface ExpenseActionsProps {
    expenses: {
        expenseDate: Date | string;
        category: { name: string };
        description: string;
        vendorName?: string | null;
        baseAmount?: number;
        gstApplicable?: boolean;
        gstRate?: number;
        gstAmount?: number;
        totalAmount: number;
        paymentMode: string;
        paymentStatus: string;
        paidAmount: number;
        referenceNo?: string | null;
        createdBy?: { name: string | null } | null;
    }[];
}

export function ExpenseActions({ expenses }: ExpenseActionsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleExport = (format: "xlsx" | "csv") => {
        const data = expenses.map(e => ({
            expenseDate: new Date(e.expenseDate).toLocaleDateString(),
            category: e.category.name,
            description: e.description,
            vendorName: e.vendorName,
            baseAmount: e.baseAmount,
            gstApplicable: e.gstApplicable,
            gstRate: e.gstRate,
            gstAmount: e.gstAmount,
            totalAmount: e.totalAmount,
            paymentMode: e.paymentMode,
            paymentStatus: e.paymentStatus,
            paidAmount: e.paidAmount,
            referenceNo: e.referenceNo,
            createdBy: e.createdBy?.name || "Unknown"
        }));

        if (format === "xlsx") {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Expenses");
            const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `expenses-${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
             const ws = XLSX.utils.json_to_sheet(data);
             const csv = XLSX.utils.sheet_to_csv(ws);
             const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
             saveAs(blob, `expenses-${new Date().toISOString().split('T')[0]}.csv`);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<ExpenseImportRow>(ws);

                // Process import
                const result = await importExpensesFromCSV(data);
                if (result.success) {
                    toast.success(`Imported ${result.count} expenses successfully`);
                    if (result.errors && result.errors.length > 0) {
                        console.error(result.errors);
                        toast.warning(`Some rows failed. Check console for details.`);
                    }
                } else {
                    toast.error("Import failed");
                }
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            toast.error("Failed to read file");
            setIsImporting(false);
        }
    };

    return (
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
            />
            <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import
            </Button>
            <Button variant="outline" onClick={() => handleExport("xlsx")}>
                <Download className="h-4 w-4 mr-2" />
                Export
            </Button>
        </div>
    );
}
