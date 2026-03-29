import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { ensureSalesReturnReplacementSchema, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesReturnReplacementInvoiceResolverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.SALES_VIEW))) redirect("/");

  const { id } = await params;
  await ensureSalesReturnReplacementSchema();

  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    select: { id: true, returnNumber: true },
  });
  if (!salesReturn) notFound();

  const mapped = await prisma
    .$queryRawUnsafe<Array<{ invoiceId: string }>>(
      `SELECT invoiceId FROM "SalesReturnReplacement" WHERE salesReturnId = ? LIMIT 1`,
      id
    )
    .catch(() => []);
  const mappedInvoiceId = mapped?.[0]?.invoiceId;
  if (mappedInvoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: mappedInvoiceId }, select: { id: true, token: true } });
    if (inv?.token) redirect(`/invoice/${inv.token}`);
    if (inv?.id) redirect(`/invoices/${inv.id}`);

    const viaSale = await prisma.sale.findUnique({
      where: { id: mappedInvoiceId },
      select: {
        invoice: { select: { id: true, token: true } },
        legacyInvoice: { select: { id: true, token: true } },
      },
    });
    const sInv = viaSale?.invoice || viaSale?.legacyInvoice;
    if (sInv?.token) redirect(`/invoice/${sInv.token}`);
    if (sInv?.id) redirect(`/invoices/${sInv.id}`);
  }

  const rn = String(salesReturn.returnNumber || "").trim();
  if (rn) {
    const byReplacementSale = await prisma.sale.findFirst({
      where: {
        platform: "REPLACEMENT",
        notes: { contains: rn },
      },
      orderBy: { saleDate: "desc" },
      select: {
        invoice: { select: { id: true, token: true } },
        legacyInvoice: { select: { id: true, token: true } },
      },
    });
    const saleInvoice = byReplacementSale?.invoice || byReplacementSale?.legacyInvoice;
    if (saleInvoice?.token) redirect(`/invoice/${saleInvoice.token}`);
    if (saleInvoice?.id) redirect(`/invoices/${saleInvoice.id}`);

    const byReplacementInvoice = await prisma.invoice.findFirst({
      where: { status: "REPLACEMENT", notes: { contains: rn } },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true },
    });
    if (byReplacementInvoice?.token) redirect(`/invoice/${byReplacementInvoice.token}`);
    if (byReplacementInvoice?.id) redirect(`/invoices/${byReplacementInvoice.id}`);
  }

  notFound();
}

