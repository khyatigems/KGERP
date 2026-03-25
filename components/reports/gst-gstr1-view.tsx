"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type HsnRow = { hsn: string; rate: number; desc: string; qty: number; val: number; txval: number; iamt: number; camt: number; samt: number };
type GstrInvoiceRow = { invoiceNumber: string; invoiceDate: string | null; subtotal: number; taxTotal: number; totalAmount: number; posState: string; interstate: boolean; customerGstin: string | null };

type GstApiResponse = {
  summary: {
    b2bCount: number;
    b2clCount: number;
    b2csCount: number;
    cdnrCount: number;
    cdnurCount: number;
    totals: { taxable: number; tax: number; total: number };
  };
  details: {
    b2b: GstrInvoiceRow[];
    b2cl: GstrInvoiceRow[];
    b2cs: GstrInvoiceRow[];
    hsn: HsnRow[];
  };
};

export function GstGstr1View() {
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { from, to, fp } = useMemo(() => {
    const [y, m] = month.split("-").map((x) => Number(x));
    const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const to = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    const fp = `${String(m).padStart(2, "0")}${String(y)}`;
    return { from, to, fp };
  }, [month]);

  const url = `/api/reports/gst/gstr1?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&fp=${encodeURIComponent(fp)}`;
  const { data, isLoading } = useSWR<GstApiResponse>(url, fetcher);

  const downloadV22 = () => {
    window.open(`${url}&format=v22`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST → GSTR-1</h1>
          <p className="text-sm text-muted-foreground">B2B / B2C Large / B2C Small / Credit Notes / HSN summary</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[170px]" />
          <Button variant="outline" onClick={downloadV22}>Download JSON (v2.2)</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxable</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data?.summary.totals.taxable || 0)}</div></CardContent>
        </Card>
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">GST</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data?.summary.totals.tax || 0)}</div></CardContent>
        </Card>
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data?.summary.totals.total || 0)}</div></CardContent>
        </Card>
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Docs</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">B2B {data?.summary.b2bCount || 0} • B2CL {data?.summary.b2clCount || 0}</div>
            <div className="text-sm text-muted-foreground">B2CS {data?.summary.b2csCount || 0}</div>
            <div className="text-sm text-muted-foreground">CDNR {data?.summary.cdnrCount || 0} • CDNUR {data?.summary.cdnurCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className={isLoading ? "animate-pulse" : ""}>
        <CardHeader>
          <CardTitle>HSN-wise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN</TableHead>
                  <TableHead>Desc</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.details.hsn?.length ? (
                  data.details.hsn.map((r) => (
                    <TableRow key={`${r.hsn}-${r.rate}`}>
                      <TableCell className="font-medium">{r.hsn}</TableCell>
                      <TableCell>{r.desc}</TableCell>
                      <TableCell className="text-right">{r.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.txval)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.iamt)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.camt)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.samt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">No data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
