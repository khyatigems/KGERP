import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";
import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";

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

      <CustomerDetailTabs
        customer={{
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          phoneSecondary,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          country: customer.country,
          pincode: customer.pincode,
          pan: customer.pan,
          gstin: customer.gstin,
          notes: customer.notes,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        }}
      />
    </div>
  );
}
