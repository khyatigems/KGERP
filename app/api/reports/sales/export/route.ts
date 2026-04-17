import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 1000;

type ExportSaleRow = {
  id: string;
  orderId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  saleDate: Date;
  salePrice: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentStatus: string | null;
  platform: string;
  profit: number | null;
  costPriceSnapshot: number | null;
  inventory: {
    sku: string;
    itemName: string;
    flatPurchaseCost: number | null;
    purchaseRatePerCarat: number | null;
    weightValue: number | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    discountTotal: number;
    displayOptions: string | null;
  } | null;
  legacyInvoice: {
    invoiceNumber: string;
  } | null;
};

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function computeProfitMap(rows: Array<{
  id: string;
  netAmount: number;
  taxAmount: number;
  discountAmount: number;
  costPriceSnapshot: number | null;
  profit: number | null;
  inventory: {
    flatPurchaseCost: number | null;
    purchaseRatePerCarat: number | null;
    weightValue: number | null;
  };
  invoice: {
    id: string;
    discountTotal: number;
    displayOptions: string | null;
  } | null;
}>) {
  const out = new Map<string, number>();
  const groups = new Map<string, typeof rows>();
  for (const s of rows) {
    const invoiceId = s.invoice?.id;
    if (!invoiceId) continue;
    const list = groups.get(invoiceId) || [];
    list.push(s);
    groups.set(invoiceId, list);
  }

  for (const list of groups.values()) {
    const invoice = list[0]?.invoice;
    if (!invoice) continue;

    const itemsTotal = list.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
    if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) continue;

    const taxableTotal = list.reduce((sum, s) => {
      const net = Number(s.netAmount || 0);
      const tax = Number(s.taxAmount ?? NaN);
      const base = Number.isFinite(tax) && tax > 0 ? net - tax : net;
      return sum + (Number.isFinite(base) ? base : 0);
    }, 0);
    if (!Number.isFinite(taxableTotal) || taxableTotal <= 0) continue;

    const totalItemDiscount = list.reduce((sum, s) => sum + Number(s.discountAmount || 0), 0);
    const persistedDiscountTotal = Number(invoice.discountTotal || 0);
    const couponDiscount = Math.max(0, persistedDiscountTotal - totalItemDiscount);

    let invoiceDisplayDiscount = 0;
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(String(invoice.displayOptions || "")) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    if (parsed) {
      const affectsTotal = parsed.invoiceDiscountAffectsTotal !== false;
      const showDiscount = parsed.showInvoiceDiscount === true;
      const discountType = parsed.invoiceDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT";
      const discountValue = Number(parsed.invoiceDiscountValue || 0);
      if (
        affectsTotal &&
        (showDiscount || discountValue > 0) &&
        Number.isFinite(discountValue) &&
        discountValue > 0
      ) {
        const raw = discountType === "PERCENT" ? (itemsTotal * discountValue) / 100 : discountValue;
        invoiceDisplayDiscount = Math.max(0, Math.min(raw, itemsTotal));
      }
    }

    const totalInvoiceLevelDiscount = couponDiscount + invoiceDisplayDiscount;
    const discountTaxable = totalInvoiceLevelDiscount > 0 ? totalInvoiceLevelDiscount * (taxableTotal / itemsTotal) : 0;

    for (const s of list) {
      const costSnapshot = Number(s.costPriceSnapshot ?? NaN);
      const invFlatCost = Number(s.inventory?.flatPurchaseCost ?? NaN);
      const invRate = Number(s.inventory?.purchaseRatePerCarat ?? NaN);
      const invWeight = Number(s.inventory?.weightValue ?? NaN);
      const computedInventoryCost = Number.isFinite(invFlatCost) && invFlatCost > 0
        ? invFlatCost
        : (Number.isFinite(invRate) && Number.isFinite(invWeight) && invRate > 0 && invWeight > 0)
        ? invRate * invWeight
        : NaN;
      const effectiveCost = Number.isFinite(costSnapshot) ? costSnapshot : computedInventoryCost;
      const net = Number(s.netAmount || 0);
      const tax = Number(s.taxAmount ?? NaN);
      const lineTaxable = Number.isFinite(tax) && tax > 0 ? net - tax : net;
      const baseProfit = Number.isFinite(effectiveCost) ? lineTaxable - effectiveCost : Number(s.profit || 0);
      const weight = taxableTotal > 0 ? lineTaxable / taxableTotal : 0;
      const share = discountTaxable > 0 ? discountTaxable * weight : 0;
      out.set(s.id, baseProfit - (Number.isFinite(share) ? share : 0));
    }
  }

  return out;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().toLowerCase();
  const sort = sp.get("sort") === "invoice" ? "invoice" : "date";

  const baseSearchOr = (() => {
    if (!q) return undefined;

    const ors: any[] = [
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
      { customerPhone: { contains: q } },
      { orderId: { contains: q } },
      { platform: { contains: q } },
      { inventory: { sku: { contains: q } } },
      { inventory: { itemName: { contains: q } } },
      { invoice: { invoiceNumber: { contains: q } } },
      { legacyInvoice: { invoiceNumber: { contains: q } } },
    ];

    const maybeAmount = Number(q);
    if (Number.isFinite(maybeAmount)) {
      ors.push({ netAmount: { equals: maybeAmount } });
      ors.push({ salePrice: { equals: maybeAmount } });
    }

    return ors;
  })();

  const where = baseSearchOr ? ({ OR: baseSearchOr } as any) : ({} as any);

  const orderBy = sort === "invoice"
    ? ([
        { invoice: { invoiceNumber: "desc" as const } },
        { saleDate: "desc" as const },
      ] as const)
    : ([{ saleDate: "desc" as const }] as const);

  const headers = [
    "Date",
    "Invoice #",
    "Invoice Type",
    "Customer",
    "Order ID",
    "SKU",
    "Item",
    "Platform",
    "Net Amount",
    "Profit",
    "Payment Status",
  ];

  const today = new Date().toISOString().slice(0, 10);
  const filename = `sales_export_${today}.csv`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(headers.map(csvEscape).join(",") + "\n"));

      let skip = 0;
      while (true) {
        const rows = (await prisma.sale.findMany({
          where,
          orderBy: orderBy as any,
          skip,
          take: CHUNK_SIZE,
          select: {
            id: true,
            orderId: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            saleDate: true,
            salePrice: true,
            taxAmount: true,
            discountAmount: true,
            netAmount: true,
            paymentStatus: true,
            platform: true,
            profit: true,
            costPriceSnapshot: true,
            inventory: {
              select: {
                sku: true,
                itemName: true,
                flatPurchaseCost: true,
                purchaseRatePerCarat: true,
                weightValue: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                invoiceType: true,
                discountTotal: true,
                displayOptions: true,
              },
            },
            legacyInvoice: {
              select: {
                invoiceNumber: true,
              },
            },
          },
        })) as unknown as ExportSaleRow[];

        if (!rows.length) break;

        const invoiceIds = Array.from(new Set(rows.map((r) => r.invoice?.id).filter(Boolean))) as string[];
        const invoiceLines = invoiceIds.length
          ? await prisma.sale.findMany({
              where: { invoiceId: { in: invoiceIds } },
              select: {
                id: true,
                netAmount: true,
                taxAmount: true,
                discountAmount: true,
                costPriceSnapshot: true,
                profit: true,
                inventory: {
                  select: {
                    flatPurchaseCost: true,
                    purchaseRatePerCarat: true,
                    weightValue: true,
                  },
                },
                invoice: {
                  select: {
                    id: true,
                    discountTotal: true,
                    displayOptions: true,
                  },
                },
              },
            })
          : [];

        const profitMap = computeProfitMap(invoiceLines);

        for (const r of rows) {
          const invoiceNo = r.invoice?.invoiceNumber || r.legacyInvoice?.invoiceNumber || "-";
          const invoiceType = r.invoice?.invoiceType || "-";
          const profit = profitMap.get(r.id) ?? r.profit ?? 0;

          const line = [
            r.saleDate.toISOString().slice(0, 10),
            invoiceNo,
            invoiceType,
            r.customerName || "Walk-in",
            r.orderId || "",
            r.inventory?.sku || "",
            r.inventory?.itemName || "",
            r.platform,
            r.netAmount,
            profit,
            r.paymentStatus || "PENDING",
          ].map(csvEscape).join(",") + "\n";

          controller.enqueue(encoder.encode(line));
        }

        skip += rows.length;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
