"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF } from "@/lib/export";

interface ColumnConfig {
  header: string;
  key: string;
}

interface ExportButtonProps {
  filename: string;
  data: Record<string, unknown>[];
  columns: ColumnConfig[]; // Used for both PDF headers and data mapping
  title?: string; // PDF Title
}

export function ExportButton({
  filename,
  data,
  columns,
  title = "Report",
}: ExportButtonProps) {
  
  const handleExportExcel = () => {
    // For Excel, we create a new object with only the columns specified
    const excelData = data.map(item => {
        const row: Record<string, unknown> = {};
        columns.forEach(col => {
            row[col.header] = item[col.key];
        });
        return row;
    });
    exportToExcel(excelData, filename);
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => c.header);
    const rows = data.map(item => columns.map(col => item[col.key] as string | number));
    exportToPDF(headers, rows, filename, title);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
