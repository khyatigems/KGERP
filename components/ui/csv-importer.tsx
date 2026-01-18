"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CsvImporterProps {
  onImport: (data: any[]) => Promise<{ success: boolean; message: string; errors?: any[] }>;
  templateHeaders: string[];
}

export function CsvImporter({ onImport, templateHeaders }: CsvImporterProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; errors?: any[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      setData(jsonData);
      setResult(null);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await onImport(data);
      setResult(res);
      if (res.success) {
        setData([]);
      }
    } catch (e) {
      setResult({ success: false, message: "Import failed unexpectedly." });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload CSV/Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            <div className="text-sm text-muted-foreground">
                Expected Headers: {templateHeaders.join(", ")}
            </div>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle>2. Preview ({data.length} rows)</CardTitle>
                <Button onClick={handleImport} disabled={loading}>
                    {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                    Import Data
                </Button>
             </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(data[0] || {}).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <TableCell key={j}>{String(val)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.length > 10 && <p className="text-center mt-2 text-muted-foreground">...and {data.length - 10} more</p>}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className={`p-4 rounded-md ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            <p className="font-bold">{result.message}</p>
            {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                    {result.errors.map((err, i) => (
                        <li key={i}>{JSON.stringify(err)}</li>
                    ))}
                </ul>
            )}
        </div>
      )}
    </div>
  );
}
