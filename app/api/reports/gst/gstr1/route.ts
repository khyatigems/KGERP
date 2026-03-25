import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { computeInvoiceGst } from "@/lib/invoice-gst";
import { posCode } from "@/lib/gst-utils";

export const dynamic = "force-dynamic";

type GstrInvoiceRow = {
  invoiceNumber: string;
  invoiceDate: Date | null;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  posState: string;
  interstate: boolean;
  customerGstin: string | null;
};

type HsnAgg = {
  hsn: string;
  rate: number;
  desc: string;
  qty: number;
  val: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
};

type ProcessedLine = {
  _hsn: string;
  _desc: string;
  gstRate: number;
  basePrice: number;
  finalInclusive: number;
  calculatedGst: number;
};

function toDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function normalizeState(v: string | null | undefined) {
  return (v || "").trim();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const from = toDate(sp.get("from"));
  const to = toDate(sp.get("to"));
  const format = (sp.get("format") || "").toLowerCase();
  const fp = (sp.get("fp") || "").trim();

  const company = await prisma.companySettings.findFirst({ select: { gstin: true, state: true } });
  const companyState = normalizeState(company?.state);
  const invoiceSettings = await prisma.invoiceSettings.findFirst({ select: { categoryGstRates: true } });
  const gstRates = (() => {
    try {
      const raw = invoiceSettings?.categoryGstRates;
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  })();

  const invoiceWhere: Record<string, unknown> = { isActive: true, status: { in: ["ISSUED", "PAID"] } };
  if (from || to) {
    const invoiceDate: Record<string, unknown> = {};
    if (from) invoiceDate.gte = from;
    if (to) invoiceDate.lte = to;
    invoiceWhere.invoiceDate = invoiceDate;
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere as never,
    include: {
      sales: {
        orderBy: { saleDate: "asc" },
        include: {
          inventory: { select: { hsnCode: true, category: true, itemName: true } },
        },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });

  const customerIds = Array.from(new Set(invoices.flatMap((i) => i.sales.map((s) => s.customerId).filter(Boolean) as string[])));
  const customers = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, gstin: true, state: true } })
    : [];
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const mappedInvoices: GstrInvoiceRow[] = invoices.map((inv) => {
    const sale0 = inv.sales[0];
    const customer = sale0?.customerId ? customerById.get(sale0.customerId) : undefined;
    const posState = normalizeState(customer?.state || sale0?.placeOfSupply || sale0?.customerCity || "");
    const interstate = Boolean(companyState && posState && companyState.toLowerCase() !== posState.toLowerCase());
    const customerGstin = (customer?.gstin || "").trim() || null;
    return {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      subtotal: inv.subtotal,
      taxTotal: inv.taxTotal,
      totalAmount: inv.totalAmount,
      posState,
      interstate,
      customerGstin,
    };
  });

  const b2b = mappedInvoices.filter((i) => i.customerGstin);
  const b2cl = mappedInvoices.filter((i) => !i.customerGstin && i.interstate && i.totalAmount > 250000);
  const b2cs = mappedInvoices.filter((i) => !i.customerGstin && !(i.interstate && i.totalAmount > 250000));

  const hsnMap = new Map<string, HsnAgg>();
  for (const inv of invoices) {
    const sale0 = inv.sales[0];
    const customer = sale0?.customerId ? customerById.get(sale0.customerId) : undefined;
    const posState = normalizeState(customer?.state || sale0?.placeOfSupply || sale0?.customerCity || "");
    const interstate = Boolean(companyState && posState && companyState.toLowerCase() !== posState.toLowerCase());
    const displayOptions = (() => {
      try {
        return inv.displayOptions ? (JSON.parse(inv.displayOptions) as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    })();

    const gst = computeInvoiceGst({
      items: inv.sales.map((s) => ({
        salePrice: s.salePrice,
        netAmount: s.netAmount,
        discountAmount: s.discountAmount,
        inventory: { category: s.inventory.category, itemName: s.inventory.itemName },
        _hsn: s.inventory.hsnCode || "",
        _desc: s.inventory.itemName || "",
      })),
      gstRates,
      displayOptions,
    });

    for (const line of gst.processedItems as unknown as ProcessedLine[]) {
      const hsn = (line._hsn || "NA") as string;
      const desc = (line._desc || "Item") as string;
      const rate = Number(line.gstRate || 0);
      const txval = round2(Number(line.basePrice || 0));
      const val = round2(Number(line.finalInclusive || 0));
      const tax = round2(Number(line.calculatedGst || 0));
      const iamt = interstate ? tax : 0;
      const camt = interstate ? 0 : round2(tax / 2);
      const samt = interstate ? 0 : round2(tax - camt);
      const key = `${hsn}__${rate}`;
      const current = hsnMap.get(key) || {
        hsn,
        rate,
        desc,
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
      };
      current.qty += 1;
      current.val = round2(current.val + val);
      current.txval = round2(current.txval + txval);
      current.iamt = round2(current.iamt + iamt);
      current.camt = round2(current.camt + camt);
      current.samt = round2(current.samt + samt);
      hsnMap.set(key, current);
    }
  }

  const hsn = Array.from(hsnMap.values()).sort((a, b) => (a.hsn + a.rate).localeCompare(b.hsn + b.rate));

  const creditNotes = await prisma.creditNote.findMany({
    where: { isActive: true, ...(from || to ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
    include: { customer: { select: { gstin: true, state: true } }, invoice: { select: { invoiceNumber: true, invoiceDate: true } } },
    orderBy: { issueDate: "asc" },
  });

  const cdnr = creditNotes.filter((cn) => (cn.customer?.gstin || "").trim());
  const cdnur = creditNotes.filter((cn) => !(cn.customer?.gstin || "").trim());

  const summary = {
    b2bCount: b2b.length,
    b2clCount: b2cl.length,
    b2csCount: b2cs.length,
    cdnrCount: cdnr.length,
    cdnurCount: cdnur.length,
    totals: {
      taxable: round2(mappedInvoices.reduce((s, i) => s + (i.subtotal || 0), 0)),
      tax: round2(mappedInvoices.reduce((s, i) => s + (i.taxTotal || 0), 0)),
      total: round2(mappedInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0)),
    },
  };

  const v22 = (() => {
    const fpVal = fp || "";
    const formatDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10).split("-").reverse().join("-") : "");
    type V22B2BInv = { inum: string; idt: string; val: number; pos: string; rchrg: "N"; inv_typ: "R" };
    const b2bObj = b2b.reduce((acc, inv) => {
      const ctin = inv.customerGstin as string;
      acc[ctin] = acc[ctin] || [];
      acc[ctin].push({
        inum: inv.invoiceNumber,
        idt: formatDate(inv.invoiceDate),
        val: inv.totalAmount,
        pos: inv.posState,
        rchrg: "N",
        inv_typ: "R",
      });
      return acc;
    }, {} as Record<string, V22B2BInv[]>);

    type V22B2CLInv = { inum: string; idt: string; val: number };
    const b2clObj = b2cl.reduce((acc, inv) => {
      const pos = inv.posState || "NA";
      acc[pos] = acc[pos] || [];
      acc[pos].push({ inum: inv.invoiceNumber, idt: formatDate(inv.invoiceDate), val: inv.totalAmount });
      return acc;
    }, {} as Record<string, V22B2CLInv[]>);

    const b2csRows = b2cs.map((inv) => {
      const rt = inv.subtotal > 0 ? round2((inv.taxTotal / inv.subtotal) * 100) : 0;
      const sply_ty = inv.interstate ? "INTER" : "INTRA";
      const iamt = inv.interstate ? inv.taxTotal : 0;
      const camt = inv.interstate ? 0 : round2(inv.taxTotal / 2);
      const samt = inv.interstate ? 0 : round2(inv.taxTotal - camt);
      return {
        sply_ty,
        pos: posCode(inv.posState || "NA"),
        typ: "OE",
        rt,
        txval: inv.subtotal,
        iamt,
        camt,
        samt,
        csamt: 0,
      };
    });

    const hsnData = hsn.map((r, idx) => ({
      num: idx + 1,
      hsn_sc: r.hsn,
      desc: r.desc,
      uqc: "NOS",
      qty: r.qty,
      val: r.val,
      txval: r.txval,
      iamt: r.iamt,
      camt: r.camt,
      samt: r.samt,
      csamt: 0,
      rt: r.rate,
    }));

    type V22CDNRNt = { nt_num: string; nt_dt: string; val: number; pos: string; inv_num: string; inv_dt: string; nt_ty: "C" };
    const cdnrObj = cdnr.reduce((acc, cn) => {
      const ctin = (cn.customer?.gstin || "").trim();
      if (!ctin) return acc;
      acc[ctin] = acc[ctin] || [];
      acc[ctin].push({
        nt_num: cn.creditNoteNumber,
        nt_dt: formatDate(cn.issueDate),
        val: cn.totalAmount,
        pos: posCode(normalizeState(cn.customer?.state) || "NA"),
        inv_num: cn.invoice?.invoiceNumber || "",
        inv_dt: cn.invoice?.invoiceDate ? formatDate(cn.invoice.invoiceDate) : "",
        nt_ty: "C",
      });
      return acc;
    }, {} as Record<string, V22CDNRNt[]>);

    const cdnurRows = cdnur.map((cn) => ({
      nt_num: cn.creditNoteNumber,
      nt_dt: formatDate(cn.issueDate),
      val: cn.totalAmount,
      pos: posCode(normalizeState(cn.customer?.state) || "NA"),
      nt_ty: "C",
    }));

    return {
      gstin: (company?.gstin || "").trim(),
      fp: fpVal,
      version: "GST1V2.2",
      b2b: Object.entries(b2bObj).map(([ctin, inv]) => ({ ctin, inv })),
      b2cl: Object.entries(b2clObj).map(([pos, inv]) => ({ pos, inv })),
      b2cs: b2csRows,
      cdnr: Object.entries(cdnrObj).map(([ctin, nt]) => ({ ctin, nt })),
      cdnur: cdnurRows,
      hsn: { data: hsnData },
    };
  })();

  if (format === "v22") return NextResponse.json(v22);

  return NextResponse.json({
    summary,
    details: {
      b2b,
      b2cl,
      b2cs,
      cdnr,
      cdnur,
      hsn,
    },
  });
}
