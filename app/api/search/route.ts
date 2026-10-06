import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") || "4", 10);
  const pageParam = Number.parseInt(request.nextUrl.searchParams.get("page") || "0", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(20, Math.max(1, limitParam)) : 4;
  const page = Number.isFinite(pageParam) ? Math.max(0, Math.min(1000, pageParam)) : 0;
  if (query.length < 2) return NextResponse.json({ results: [], hasMore: false, page, limit });
  const take = limit + 1;
  const skip = page * limit;

  const userId = session.user.id;
  const [canViewInventory, canViewSales, canManageInvoices, canViewQuotes, canViewPurchases, canViewCustomers, canViewVendors] =
    await Promise.all([
      checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW),
      checkUserPermission(userId, PERMISSIONS.SALES_VIEW),
      checkUserPermission(userId, PERMISSIONS.INVOICE_MANAGE),
      checkUserPermission(userId, PERMISSIONS.QUOTATION_VIEW),
      checkUserPermission(userId, PERMISSIONS.PURCHASES_VIEW),
      checkUserPermission(userId, PERMISSIONS.CUSTOMER_VIEW),
      checkUserPermission(userId, PERMISSIONS.VENDOR_VIEW),
    ]);

  const [inventory, invoices, quotations, purchases, customers, vendors] = await Promise.all([
    canViewInventory
      ? prisma.inventory.findMany({
          where: {
            OR: [
              { sku: { contains: query } },
              { itemName: { contains: query } },
              { internalName: { contains: query } },
              { gemType: { contains: query } },
              { category: { contains: query } },
              { color: { contains: query } },
              { certificateNo: { contains: query } },
              { certificateNumber: { contains: query } },
            ],
          },
          select: { id: true, sku: true, itemName: true, category: true, gemType: true, color: true, status: true },
          take,
          skip,
          orderBy: { updatedAt: "desc" },
        })
      : [],
    canViewSales || canManageInvoices
      ? prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: query } },
              { sales: { some: { customerName: { contains: query } } } },
              { legacySale: { is: { customerName: { contains: query } } } },
              { quotation: { is: { customerName: { contains: query } } } },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            paymentStatus: true,
            sales: { take: 1, select: { customerName: true } },
            legacySale: { select: { customerName: true } },
            quotation: { select: { customerName: true } },
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        })
      : [],
    canViewQuotes
      ? prisma.quotation.findMany({
          where: {
            OR: [
              { quotationNumber: { contains: query } },
              { customerName: { contains: query } },
              { customerEmail: { contains: query } },
              { customerMobile: { contains: query } },
            ],
          },
          select: { id: true, quotationNumber: true, customerName: true, status: true },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        })
      : [],
    canViewPurchases
      ? prisma.purchase.findMany({
          where: {
            OR: [
              { invoiceNo: { contains: query } },
              { notes: { contains: query } },
              { vendor: { is: { name: { contains: query } } } },
              { purchaseItems: { some: { itemName: { contains: query } } } },
            ],
          },
          select: { id: true, invoiceNo: true, paymentStatus: true, vendor: { select: { name: true } } },
          take,
          skip,
          orderBy: { purchaseDate: "desc" },
        })
      : [],
    canViewCustomers
      ? prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
              { phoneSecondary: { contains: query } },
              { gstin: { contains: query } },
            ],
          },
          select: { id: true, name: true, email: true, phone: true, city: true },
          take,
          skip,
          orderBy: { updatedAt: "desc" },
        })
      : [],
    canViewVendors
      ? prisma.vendor.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
              { gstin: { contains: query } },
            ],
          },
          select: { id: true, name: true, email: true, phone: true, city: true },
          take,
          skip,
          orderBy: { updatedAt: "desc" },
        })
      : [],
  ]);

  const groupedResults: SearchResult[][] = [
    inventory.map((item) => ({
      id: `inventory-${item.id}`,
      type: "Inventory",
      title: `${item.sku} - ${item.itemName}`,
      subtitle: [item.gemType || item.category, item.color, item.status.replaceAll("_", " ")].filter(Boolean).join(" - "),
      href: `/inventory/${item.id}`,
    })),
    invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "Invoice",
      title: invoice.invoiceNumber,
      subtitle: [
        invoice.sales[0]?.customerName || invoice.legacySale?.customerName || invoice.quotation?.customerName,
        invoice.paymentStatus,
      ].filter(Boolean).join(" - "),
      href: `/invoices/${invoice.id}`,
    })),
    quotations.map((quotation) => ({
      id: `quotation-${quotation.id}`,
      type: "Quotation",
      title: quotation.quotationNumber,
      subtitle: [quotation.customerName, quotation.status].filter(Boolean).join(" - "),
      href: `/quotes/${quotation.id}`,
    })),
    purchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      type: "Purchase",
      title: purchase.invoiceNo || "Purchase",
      subtitle: [purchase.vendor?.name, purchase.paymentStatus].filter(Boolean).join(" - "),
      href: `/purchases/${purchase.id}`,
    })),
    customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: "Customer",
      title: customer.name,
      subtitle: [customer.phone, customer.email, customer.city].filter(Boolean).join(" - "),
      href: `/customers/${customer.id}`,
    })),
    vendors.map((vendor) => ({
      id: `vendor-${vendor.id}`,
      type: "Vendor",
      title: vendor.name,
      subtitle: [vendor.phone, vendor.email, vendor.city].filter(Boolean).join(" - "),
      href: `/vendors/${vendor.id}`,
    })),
  ];

  const hasMore = groupedResults.some((group) => group.length > limit);
  const results = groupedResults.flatMap((group) => group.slice(0, limit));
  return NextResponse.json({ results, hasMore, page, limit });
}
