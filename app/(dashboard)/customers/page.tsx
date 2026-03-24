import { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { buildCustomerExport } from "@/lib/customer-export";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import { ExportButton } from "@/components/ui/export-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Customers | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  const sp = await searchParams;
  const q = (sp.q || "").trim();

  const where = q
    ? ({
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { phoneSecondary: { contains: q } },
          { city: { contains: q } },
        ],
      } as unknown)
    : undefined;

  const customers = await prisma.customer.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
  });

  const canExport = hasPermission(session.user.role, PERMISSIONS.CUSTOMER_EXPORT);

  const { rows: exportData, columns: exportColumns } = buildCustomerExport(customers);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Central customer profile repository for invoices and quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <ExportButton filename="customers" data={exportData} columns={exportColumns} title="Customers" label="Export Customers" />
          )}
          <Button asChild>
            <LoadingLink href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </LoadingLink>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{c.phone || "-"}</span>
                      {(c as unknown as { phoneSecondary?: string | null }).phoneSecondary ? (
                        <span className="text-xs text-muted-foreground">
                          {(c as unknown as { phoneSecondary?: string | null }).phoneSecondary}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{c.email || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.city || "-"} {c.state ? `, ${c.state}` : ""} {c.country ? `, ${c.country}` : ""}
                  </TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/customers/${c.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/customers/${c.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
