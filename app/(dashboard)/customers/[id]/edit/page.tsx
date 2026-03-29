import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { CustomerForm } from "@/components/customers/customer-form";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";

export const metadata: Metadata = {
  title: "Edit Customer | KhyatiGems™",
};

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_MANAGE)) redirect("/");

  await ensureCustomerSecondaryPhoneSchema();
  await ensureBillfreePhase1Schema();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const extra = await prisma.$queryRawUnsafe<Array<{
    dateOfBirth: string | null;
    anniversaryDate: string | null;
    communicationOptIn: number | null;
    preferredLanguage: string | null;
  }>>(
    `SELECT dateOfBirth, anniversaryDate, communicationOptIn, preferredLanguage
     FROM "CustomerProfileExtra" WHERE customerId = ? LIMIT 1`,
    id
  ).catch(() => []);
  const e = extra?.[0];
  const merged = {
    ...customer,
    dateOfBirth: e?.dateOfBirth || null,
    anniversaryDate: e?.anniversaryDate || null,
    communicationOptIn: e?.communicationOptIn == null ? true : Boolean(e.communicationOptIn),
    preferredLanguage: e?.preferredLanguage || null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <CustomerForm customer={merged} />
        </div>
      </div>
    </div>
  );
}
