import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";

export const metadata: Metadata = {
  title: "Customer Details | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  await ensureCustomerSecondaryPhoneSchema();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();
  const phoneSecondary = (customer as unknown as { phoneSecondary?: string | null }).phoneSecondary || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">Created {formatDate(customer.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {hasPermission(session.user.role, PERMISSIONS.CUSTOMER_MANAGE) && (
            <Button asChild variant="outline">
              <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/customers">Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {customer.email || "-"}</div>
            <div><span className="text-muted-foreground">Primary Phone:</span> {customer.phone || "-"}</div>
            <div><span className="text-muted-foreground">Secondary Phone:</span> {phoneSecondary || "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="whitespace-pre-wrap">{customer.address || "-"}</div>
            <div>
              {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "-"}
            </div>
            <div><span className="text-muted-foreground">Pincode:</span> {customer.pincode || "-"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">PAN:</span> {customer.pan || "-"}</div>
          <div><span className="text-muted-foreground">GSTIN:</span> {customer.gstin || "-"}</div>
          <div><span className="text-muted-foreground">Updated:</span> {formatDate(customer.updatedAt)}</div>
          <div className="md:col-span-3 whitespace-pre-wrap"><span className="text-muted-foreground">Notes:</span> {customer.notes || "-"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
