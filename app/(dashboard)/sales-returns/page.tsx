import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";
import { ensureSalesReturnReplacementSchema } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesReturnsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.SALES_VIEW))) redirect("/");

  await ensureReturnsSchema();
  await ensureSalesReturnReplacementSchema();

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; returnNumber: string; returnDate: string; disposition: string; invoiceNumber: string; customerName: string | null }>
  >(
    `SELECT sr.id,
            sr.returnNumber,
            sr.returnDate,
            sr.disposition,
            i.invoiceNumber,
            (SELECT COALESCE(s.customerName, c.name)
             FROM Sale s
             LEFT JOIN Customer c ON c.id = s.customerId
             WHERE s.invoiceId = i.id
             ORDER BY s.saleDate DESC
             LIMIT 1) as customerName
     FROM SalesReturn sr
     JOIN Invoice i ON i.id = sr.invoiceId
     ORDER BY sr.returnDate DESC
     LIMIT 200`
  );

  const replacementIds = rows.filter((r) => r.disposition === "REPLACEMENT").map((r) => r.id);
  const replacementReturnNumbers = rows
    .filter((r) => r.disposition === "REPLACEMENT")
    .map((r) => r.returnNumber)
    .filter(Boolean);
  const replacementMap = replacementIds.length
    ? await prisma.$queryRawUnsafe<Array<{ salesReturnId: string; invoiceId: string; memoId: string | null }>>(
        `SELECT salesReturnId, invoiceId, memoId FROM "SalesReturnReplacement" WHERE salesReturnId IN (${replacementIds.map(() => "?").join(",")})`,
        ...(replacementIds as unknown as string[])
      )
    : [];
  const replBySrId = new Map(replacementMap.map((r) => [r.salesReturnId, r.invoiceId]));
  const invoiceIds = Array.from(new Set(replacementMap.map((r) => r.invoiceId)));
  const invoicesById = invoiceIds.length
    ? await prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true, token: true } })
    : [];
  const invNoById = new Map(invoicesById.map((i) => [i.id, i.invoiceNumber]));
  const invTokenById = new Map(invoicesById.map((i) => [i.id, i.token]));

  const unresolvedIds = invoiceIds.filter((x) => !invTokenById.get(x));
  const saleLinkRows = unresolvedIds.length
    ? await prisma.sale.findMany({
        where: { id: { in: unresolvedIds } },
        select: {
          id: true,
          invoice: { select: { id: true, invoiceNumber: true, token: true } },
          legacyInvoice: { select: { id: true, invoiceNumber: true, token: true } },
        },
      })
    : [];
  const saleInvoiceById = new Map(
    saleLinkRows.map((s) => [
      s.id,
      (s.invoice || s.legacyInvoice) as { id: string; invoiceNumber: string; token: string } | null,
    ])
  );

  const legacyReplacementInvoices = replacementReturnNumbers.length
    ? await prisma.invoice.findMany({
        where: {
          status: "REPLACEMENT",
          OR: replacementReturnNumbers.map((rn) => ({ notes: { contains: rn } })),
        },
        select: { id: true, token: true, invoiceNumber: true, notes: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }).catch(() => [])
    : [];
  const legacyInvoiceByReturnNumber = new Map<string, { id: string; token: string; invoiceNumber: string }>();
  for (const rn of replacementReturnNumbers) {
    const match = legacyReplacementInvoices.find((inv) => String(inv.notes || "").includes(rn));
    if (match?.id && match?.token) {
      legacyInvoiceByReturnNumber.set(rn, { id: match.id, token: match.token, invoiceNumber: match.invoiceNumber });
    }
  }

  if (replacementIds.length) {
    const updates: Array<{ salesReturnId: string; invoiceId: string }> = [];
    for (const r of rows.filter((x) => x.disposition === "REPLACEMENT")) {
      const current = replBySrId.get(r.id) || "";
      const hasToken = current ? !!invTokenById.get(current) : false;
      const viaSale = current ? saleInvoiceById.get(current) : null;
      if (hasToken || viaSale?.token) continue;
      const legacy = legacyInvoiceByReturnNumber.get(r.returnNumber);
      if (legacy?.id) {
        updates.push({ salesReturnId: r.id, invoiceId: legacy.id });
      }
    }
    if (updates.length) {
      await Promise.all(
        updates.map((u) =>
          prisma
            .$executeRawUnsafe(
              `INSERT OR REPLACE INTO "SalesReturnReplacement" (salesReturnId, invoiceId, createdAt) VALUES (?, ?, CURRENT_TIMESTAMP)`,
              u.salesReturnId,
              u.invoiceId
            )
            .catch(() => {})
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Returns</h1>
          <p className="text-sm text-muted-foreground">Create returns and credit notes against invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/sales-returns/credit-notes">Credit Notes</Link>
          </Button>
          {(await checkUserPermission(session.user.id, PERMISSIONS.SALES_CREATE)) && (
            <Button asChild>
              <Link href="/sales-returns/new">
                <Plus className="mr-2 h-4 w-4" />
                New Return
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Disposition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sales returns yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: { id: string; returnNumber: string; returnDate: string; disposition: string; invoiceNumber: string; customerName: string | null }) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link href={`/sales-returns/${r.id}`} className="underline">{r.returnNumber}</Link>
                      </TableCell>
                      <TableCell>{formatDate(r.returnDate)}</TableCell>
                      <TableCell>{r.invoiceNumber}</TableCell>
                      <TableCell>
                        {r.disposition}{" "}
                        {r.disposition === "REPLACEMENT" ? (
                          replBySrId.has(r.id) ? (() => {
                            const invoiceId = replBySrId.get(r.id) || "";
                            const directToken = invTokenById.get(invoiceId);
                            const viaSale = saleInvoiceById.get(invoiceId) || null;
                            const legacy = legacyInvoiceByReturnNumber.get(r.returnNumber);
                            const resolvedToken = directToken || viaSale?.token || legacy?.token || "";
                            const resolvedInvoiceNo =
                              invNoById.get(invoiceId) || viaSale?.invoiceNumber || legacy?.invoiceNumber || "REPLACEMENT";
                            const href = resolvedToken
                              ? `/invoice/${encodeURIComponent(resolvedToken)}`
                              : `/invoices/${encodeURIComponent(invoiceId)}`;
                            return (
                              <Link
                                href={href}
                                className="ml-2 text-xs text-muted-foreground underline"
                              >
                                Dispatched ({resolvedInvoiceNo})
                              </Link>
                            );
                          })() : (
                            <Link
                              href={`/sales-returns/replace/${r.id}?customerName=${encodeURIComponent(r.customerName || "")}`}
                              className="ml-2 text-xs text-primary underline"
                            >
                              Dispatch
                            </Link>
                          )
                        ) : null}
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
