import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import crypto from "crypto";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";
import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";

export const metadata: Metadata = {
  title: "Customer Details | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  await ensureCustomerSecondaryPhoneSchema();
  await ensureReturnsSchema();
  await ensureBillfreePhase1Schema();

  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();
  const phoneSecondary = (customer as unknown as { phoneSecondary?: string | null }).phoneSecondary || null;
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
  const customerExtra = extra?.[0] || null;

  const customerCode = await (async () => {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
        id
      );
      if (rows[0]?.code) return rows[0].code;

      const year2 = String(new Date().getFullYear()).slice(-2);
      let code = "";
      for (let i = 0; i < 20; i++) {
        const rnd = crypto.randomInt(0, 1000000);
        const candidate = `C${year2}-${String(rnd).padStart(6, "0")}`;
        const collision = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
          `SELECT code FROM CustomerCode WHERE code = ? LIMIT 1`,
          candidate
        );
        if (!collision.length) {
          code = candidate;
          break;
        }
      }
      if (code) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO CustomerCode (id, customerId, code, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          crypto.randomUUID(),
          id,
          code
        );
      }
      return code || null;
    } catch {
      return null;
    }
  })();

  const rawStatsRow = await prisma.$queryRawUnsafe<Array<{
    totalRevenue: unknown;
    orderCount: unknown;
    highestOrder: unknown;
  }>>(`
    SELECT 
      SUM(s.netAmount) as totalRevenue,
      COUNT(DISTINCT s.invoiceId) as orderCount,
      MAX(i.totalAmount) as highestOrder
    FROM "Sale" s
    JOIN "Invoice" i ON s.invoiceId = i.id
    WHERE s.customerId = ? AND s.platform != 'REPLACEMENT'
  `, id).catch(() => []);

  const toNumber = (val: unknown): number => {
    if (typeof val === "bigint") return Number(val);
    if (typeof val === "number") return val;
    if (typeof val === "string") return Number(val) || 0;
    return 0;
  };

  const rawStat = rawStatsRow[0] || { totalRevenue: 0, orderCount: 0, highestOrder: 0 };
  const stat = {
    totalRevenue: toNumber(rawStat.totalRevenue),
    orderCount: toNumber(rawStat.orderCount),
    highestOrder: toNumber(rawStat.highestOrder),
  };
  
  const aov = stat.orderCount > 0 ? stat.totalRevenue / stat.orderCount : 0;

  const customerSettingsRow = await prisma.setting.findUnique({ where: { key: "customer_settings" } });
  const customerSettings = customerSettingsRow ? JSON.parse(customerSettingsRow.value) : { platinumThreshold: 100000, goldThreshold: 50000 };

  let tier = "Silver";
  if (stat.totalRevenue >= customerSettings.platinumThreshold) tier = "Platinum";
  else if (stat.totalRevenue >= customerSettings.goldThreshold) tier = "Gold";

  const recentInvoices = await prisma.invoice.findMany({
    where: { sales: { some: { customerId: id } }, status: { not: "DRAFT" } },
    orderBy: { invoiceDate: "desc" },
    take: 10,
    include: { sales: { include: { inventory: { select: { itemName: true } } } } },
  });

  const loyaltyRows = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
    `SELECT ROUND(COALESCE(SUM(points),0)) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
    id
  );
  const loyaltyPoints = Number(loyaltyRows?.[0]?.points || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{customerCode ? `Customer Code: ${customerCode}` : "Customer Code: -"}</span>
            <span className="mx-2">•</span>
            Created {formatDate(customer.createdAt)}
          </p>
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
          customerCode,
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
          customerType: (customer as Record<string, unknown>).customerType as string | null,
          assignedSalesperson: (customer as Record<string, unknown>).assignedSalesperson as string | null,
          whatsappNumber: (customer as Record<string, unknown>).whatsappNumber as string | null,
          preferredContact: (customer as Record<string, unknown>).preferredContact as string | null,
          budgetRange: (customer as Record<string, unknown>).budgetRange as string | null,
          interestedIn: (customer as Record<string, unknown>).interestedIn as string | null,
          dateOfBirth: customerExtra?.dateOfBirth || null,
          anniversaryDate: customerExtra?.anniversaryDate || null,
          communicationOptIn: customerExtra?.communicationOptIn == null ? true : Boolean(customerExtra.communicationOptIn),
          preferredLanguage: customerExtra?.preferredLanguage || null,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        }}
        stats={{
          totalRevenue: stat.totalRevenue,
          orderCount: stat.orderCount,
          aov,
          highestOrder: stat.highestOrder,
          tier,
          loyaltyPoints,
        }}
        recentInvoices={recentInvoices}
      />
    </div>
  );
}
