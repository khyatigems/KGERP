import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SalesReturnDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.SALES_VIEW))) redirect("/");
  const { id } = await params;

  const srRows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      returnNumber: string;
      returnDate: string;
      disposition: string;
      taxableAmount: number;
      igst: number;
      cgst: number;
      sgst: number;
      totalTax: number;
      totalAmount: number;
      invoiceId: string | null;
      invoiceNumber: string | null;
      invoiceDate: string | null;
    }>
  >(
    `SELECT sr.id,
            sr.returnNumber,
            sr.returnDate,
            sr.disposition,
            sr.taxableAmount,
            sr.igst,
            sr.cgst,
            sr.sgst,
            sr.totalTax,
            sr.totalAmount,
            sr.invoiceId,
            i.invoiceNumber,
            i.invoiceDate
     FROM SalesReturn sr
     LEFT JOIN Invoice i ON i.id = sr.invoiceId
     WHERE sr.id = ?
     LIMIT 1`,
    id
  );
  const srRow = srRows[0];
  if (!srRow) notFound();

  const items = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      inventoryId: string;
      quantity: number;
      sellingPrice: number;
      sku: string | null;
      itemName: string | null;
      costPrice: number | null;
      inventorySellingPrice: number | null;
      status: string | null;
      stockLocation: string | null;
    }>
  >(
    `SELECT sri.id,
            sri.inventoryId,
            sri.quantity,
            sri.sellingPrice,
            inv.sku,
            inv.itemName,
            inv.costPrice,
            inv.sellingPrice as inventorySellingPrice,
            inv.status,
            inv.stockLocation
     FROM SalesReturnItem sri
     JOIN Inventory inv ON inv.id = sri.inventoryId
     WHERE sri.salesReturnId = ?
     ORDER BY sri.id ASC`,
    srRow.id
  );

  const creditNotes = srRow.invoiceId
    ? await prisma.creditNote.findMany({
        where: { invoiceId: srRow.invoiceId },
        orderBy: { issueDate: "desc" },
        take: 10,
      })
    : [];

  const invIds = items.map((it) => it.inventoryId).filter((x): x is string => Boolean(x));
  const logs = invIds.length
    ? await prisma.activityLog.findMany({
        where: { entityType: "SalesReturnItem", entityId: { in: invIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const byInvId = new Map<string, { details: string; createdAt: Date }>();
  logs.forEach((l) => {
    if (l.entityId) byInvId.set(l.entityId, { details: l.details || "", createdAt: l.createdAt });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Return</h1>
          <div className="text-sm text-muted-foreground">
            Return #: <span className="font-medium">{srRow.returnNumber}</span> • Date: {formatDate(srRow.returnDate)} • Invoice:{" "}
            <span className="font-medium">{srRow.invoiceNumber || "-"}</span> • Disposition: {srRow.disposition}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Taxable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(srRow.taxableAmount || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">GST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(srRow.totalTax || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              IGST {formatCurrency(srRow.igst || 0)} • CGST {formatCurrency(srRow.cgst || 0)} • SGST {formatCurrency(srRow.sgst || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(srRow.totalAmount || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {creditNotes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CN #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">{cn.creditNoteNumber}</TableCell>
                      <TableCell>{formatDate(cn.issueDate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cn.totalAmount || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cn.balanceAmount || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/api/credit-notes/${cn.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            Download
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Items & Valuation Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Return Selling</TableHead>
                  <TableHead className="text-right">Original Cost</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => {
                    const delta = Math.round(((it.sellingPrice || 0) - (it.costPrice || 0)) * 100) / 100;
                    const log = it.inventoryId ? byInvId.get(it.inventoryId) : undefined;
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.sku}</TableCell>
                        <TableCell>{it.itemName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.sellingPrice || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.costPrice || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(delta)}</TableCell>
                        <TableCell>{it.status || "-"} {it.stockLocation ? `(${it.stockLocation})` : ""}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log ? `${formatDate(log.createdAt)} — ${log.details}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
