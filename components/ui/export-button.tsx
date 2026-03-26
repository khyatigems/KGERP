"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

export type ColumnDef = { header: string; key: string };
export type MultiTableDef = { title: string; rows: Record<string, unknown>[]; columns: ColumnDef[] };

interface ExportButtonProps {
  filename: string;
  data?: Record<string, unknown>[];
  columns?: ColumnDef[]; // Used for both PDF headers and data mapping
  multiTable?: MultiTableDef[];
  title?: string; // PDF Title
  label?: string;
}

export function ExportButton({
  filename,
  data,
  columns,
  multiTable,
  title = "Report",
  label = "Export",
}: ExportButtonProps) {
  
  const handleExportExcel = () => {
    if (multiTable) {
      exportToExcel([], [], filename, title, multiTable);
      return;
    }
    if (!data || !columns) return;
    // For Excel, we create a new object with only the columns specified
    const excelData = data.map(item => {
        const row: Record<string, unknown> = {};
        columns.forEach(col => {
            row[col.header] = item[col.key];
        });
        return row;
    });
    exportToExcel(excelData, columns, filename, title);
  };

  const handleExportCSV = () => {
    if (multiTable) {
      let csvContent = "";
      for (const t of multiTable) {
        csvContent += t.title + "\n";
        const header = t.columns.map((c) => `"${c.header}"`).join(",");
        csvContent += header + "\n";
        t.rows.forEach((row) => {
          const rowStr = t.columns
            .map((c) => {
              const val = row[c.key] ?? "";
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",");
          csvContent += rowStr + "\n";
        });
        csvContent += "\n";
      }
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (!data || !columns) return;
    const csvData = data.map(item => {
      const row: Record<string, unknown> = {};
      columns.forEach(col => {
        row[col.header] = item[col.key];
      });
      return row;
    });
    exportToCSV(csvData, filename);
  };

  const handleExportPDF = async () => {
    if (multiTable) {
      await exportToPDF([], [], filename, title, multiTable);
      return;
    }
    if (!data || !columns) return;
    await exportToPDF(data, columns, filename, title);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto transition-all duration-200 hover:scale-105 active:scale-95">
          <Download className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          Export to CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
