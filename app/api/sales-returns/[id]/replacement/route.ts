import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { items, customerName } = await req.json().catch(() => ({}));
  if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findUnique({
        where: { id },
        include: {
          invoice: {
            include: {
              sales: {
                orderBy: { saleDate: "desc" },
                include: { inventory: { select: { sku: true, itemName: true } } },
              },
              quotation: { select: { customerId: true, customerName: true, customerMobile: true, customerEmail: true, customerCity: true, customerAddress: true } },
            },
          },
          items: { include: { inventory: { select: { sku: true, itemName: true } } } },
        },
      });
      if (!salesReturn) throw new Error("Sales return not found");

      const primarySale = salesReturn.invoice.sales?.[0] || null;
      const resolvedCustomerName =
        primarySale?.customerName ||
        salesReturn.invoice.quotation?.customerName ||
        customerName ||
        "Customer";

      const replacementInvs = await tx.inventory.findMany({
        where: { id: { in: (items as Array<{ inventoryId: string }>).map((i) => i.inventoryId) } },
        select: { id: true, sku: true, itemName: true, sellingPrice: true },
      });

      const year = new Date().getFullYear();
      const existingCount = await tx.invoice.count({
        where: { invoiceNumber: { startsWith: `RPL-${year}-` } },
      });
      const invoiceNumber = `RPL-${year}-${String(existingCount + 1).padStart(4, "0")}`;
      const token = crypto.randomBytes(16).toString("hex");

      const notesLines = [
        `Replacement against Sales Return ${salesReturn.returnNumber}`,
        salesReturn.invoice?.invoiceNumber ? `Ref Invoice: ${salesReturn.invoice.invoiceNumber}` : "",
        "",
        "Returned Item(s):",
        ...(salesReturn.items || []).map((it) => `- ${it.inventory?.sku || ""} ${it.inventory?.itemName || ""}`.trim()),
        "",
        "Replacement Item(s):",
        ...replacementInvs.map((it) => `- ${it.sku} ${it.itemName}`.trim()),
      ].filter(Boolean);

      const totalSellingPrice = replacementInvs.reduce((acc, it) => acc + (it.sellingPrice || 0), 0);

      const replacementInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          token,
          status: "REPLACEMENT",
          paymentStatus: "REPLACEMENT",
          invoiceDate: new Date(),
          subtotal: totalSellingPrice,
          taxTotal: 0,
          discountTotal: 0,
          totalAmount: totalSellingPrice,
          notes: notesLines.join("\n"),
        },
      });

      // Create Memo for replacement dispatch
      const memo = await tx.memo.create({
        data: {
          customerName: resolvedCustomerName,
        },
      });
      for (const item of items as Array<{ inventoryId: string }>) {
        const invItem = replacementInvs.find((it) => it.id === item.inventoryId);
        const itemSellingPrice = invItem?.sellingPrice || 0;

        await tx.memoItem.create({
          data: {
            memoId: memo.id,
            inventoryId: item.inventoryId,
            status: "WITH_CLIENT",
          },
        });
        await tx.sale.create({
          data: {
            inventoryId: item.inventoryId,
            invoiceId: replacementInvoice.id,
            platform: "REPLACEMENT",
            saleDate: new Date(),
            customerId: primarySale?.customerId || salesReturn.invoice.quotation?.customerId || undefined,
            customerName: resolvedCustomerName,
            customerPhone: primarySale?.customerPhone || salesReturn.invoice.quotation?.customerMobile || null,
            customerEmail: primarySale?.customerEmail || salesReturn.invoice.quotation?.customerEmail || null,
            customerCity: primarySale?.customerCity || salesReturn.invoice.quotation?.customerCity || null,
            customerAddress: primarySale?.customerAddress || salesReturn.invoice.quotation?.customerAddress || null,
            billingAddress: (primarySale as { billingAddress?: string | null })?.billingAddress || primarySale?.customerAddress || salesReturn.invoice.quotation?.customerAddress || null,
            shippingAddress: (primarySale as { shippingAddress?: string | null })?.shippingAddress || (primarySale as { billingAddress?: string | null })?.billingAddress || primarySale?.customerAddress || salesReturn.invoice.quotation?.customerAddress || null,
            placeOfSupply: (primarySale as { placeOfSupply?: string | null })?.placeOfSupply || primarySale?.customerCity || salesReturn.invoice.quotation?.customerCity || null,
            salePrice: itemSellingPrice,
            netAmount: itemSellingPrice,
            discountAmount: 0,
            taxAmount: 0,
            paymentStatus: "REPLACEMENT",
            paymentMethod: "REPLACEMENT",
            notes: `Replacement dispatch for ${salesReturn.returnNumber} (${salesReturn.invoice.invoiceNumber})`,
          } as unknown as never,
        });
        await tx.inventory.update({ where: { id: item.inventoryId }, data: { status: "SOLD" } });
      }
      await tx.activityLog.create({
        data: {
          entityType: "Memo",
          entityId: memo.id,
          entityIdentifier: memo.id,
          actionType: "CREATE",
          source: "WEB",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          details: `Replacement dispatch for SalesReturn ${id} (Invoice ${replacementInvoice.invoiceNumber})`,
        },
      });
      return { memoId: memo.id, invoiceId: replacementInvoice.id, invoiceNumber: replacementInvoice.invoiceNumber, token: replacementInvoice.token };
    });
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Failed to create replacement memo" }, { status: 500 });
  }
}
