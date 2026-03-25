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

  const invoiceItmsByInum = new Map<
    string,
    Array<{ num: number; itm_det: { rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number } }>
  >();

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

    const bucket = new Map<number, { txval: number; tax: number }>();
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

      const br = bucket.get(rate) || { txval: 0, tax: 0 };
      br.txval = round2(br.txval + txval);
      br.tax = round2(br.tax + tax);
      bucket.set(rate, br);
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

    const itms = Array.from(bucket.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rt, bkt], idx) => {
        const tax = bkt.tax;
        const iamt2 = interstate ? tax : 0;
        const camt2 = interstate ? 0 : round2(tax / 2);
        const samt2 = interstate ? 0 : round2(tax - camt2);
        return {
          num: idx + 1,
          itm_det: {
            rt,
            txval: bkt.txval,
            iamt: iamt2,
            camt: camt2,
            samt: samt2,
            csamt: 0,
          },
        };
      });
    invoiceItmsByInum.set(inv.invoiceNumber, itms);
  }

  const hsn = Array.from(hsnMap.values()).sort((a, b) => (a.hsn + a.rate).localeCompare(b.hsn + b.rate));

  const creditNotes = await prisma.$queryRawUnsafe<
    Array<{ id: string; creditNoteNumber: string; issueDate: string; totalAmount: number; taxableAmount: number; igst: number; cgst: number; sgst: number; customerId: string | null; invoiceId: string | null }>
  >(
    `SELECT id, creditNoteNumber, issueDate, totalAmount, taxableAmount, igst, cgst, sgst, customerId, invoiceId
     FROM CreditNote
     WHERE isActive = 1
       ${from ? `AND issueDate >= ?` : ``}
       ${to ? `AND issueDate <= ?` : ``}
     ORDER BY issueDate ASC`,
    ...(from && to ? [from, to] : from ? [from] : to ? [to] : [])
  );

  const customersMap = new Map<string, { gstin: string | null; state: string | null }>();
  const customerIdsCN = Array.from(new Set(creditNotes.map(cn => cn.customerId).filter(Boolean))) as string[];
  if (customerIdsCN.length) {
    const cs = await prisma.customer.findMany({ where: { id: { in: customerIdsCN } }, select: { id: true, gstin: true, state: true } });
    cs.forEach(c => customersMap.set(c.id, { gstin: c.gstin, state: c.state }));
  }
  const invoicesMap = new Map<string, { invoiceNumber: string | null; invoiceDate: Date | null }>();
  const invIdsCN = Array.from(new Set(creditNotes.map(cn => cn.invoiceId).filter(Boolean))) as string[];
  if (invIdsCN.length) {
    const invs = await prisma.invoice.findMany({ where: { id: { in: invIdsCN } }, select: { id: true, invoiceNumber: true, invoiceDate: true } });
    invs.forEach(i => invoicesMap.set(i.id, { invoiceNumber: i.invoiceNumber, invoiceDate: i.invoiceDate }));
  }
  const cdnr = creditNotes.filter((cn) => {
    const c = cn.customerId ? customersMap.get(cn.customerId) : undefined;
    return !!(c?.gstin || "").trim();
  });
  const cdnur = creditNotes.filter((cn) => {
    const c = cn.customerId ? customersMap.get(cn.customerId) : undefined;
    return !(c?.gstin || "").trim();
  });

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
    const invItms = (inum: string) => invoiceItmsByInum.get(inum) || [];
    type V22Item = { num: number; itm_det: { rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number } };
    type V22B2BInv = { inum: string; idt: string; val: number; pos: string; rchrg: "N"; inv_typ: "R"; itms: V22Item[] };
    const b2bObj = b2b.reduce((acc, inv) => {
      const ctin = inv.customerGstin as string;
      acc[ctin] = acc[ctin] || [];
      acc[ctin].push({
        inum: inv.invoiceNumber,
        idt: formatDate(inv.invoiceDate),
        val: inv.totalAmount,
        pos: posCode(inv.posState || companyState || "NA"),
        rchrg: "N",
        inv_typ: "R",
        itms: invItms(inv.invoiceNumber),
      });
      return acc;
    }, {} as Record<string, V22B2BInv[]>);

    type V22B2CLInv = { inum: string; idt: string; val: number; itms: V22Item[] };
    const b2clObj = b2cl.reduce((acc, inv) => {
      const pos = posCode(inv.posState || companyState || "NA");
      acc[pos] = acc[pos] || [];
      acc[pos].push({ inum: inv.invoiceNumber, idt: formatDate(inv.invoiceDate), val: inv.totalAmount, itms: invItms(inv.invoiceNumber) });
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

    const cnItms = (cn: { taxableAmount: number; igst: number; cgst: number; sgst: number }) => {
      const txval = round2(Number(cn.taxableAmount || 0));
      const tax = round2(Number(cn.igst || 0) + Number(cn.cgst || 0) + Number(cn.sgst || 0));
      const rt = txval > 0 ? round2((tax / txval) * 100) : 0;
      return [
        {
          num: 1,
          itm_det: {
            rt,
            txval,
            iamt: round2(Number(cn.igst || 0)),
            camt: round2(Number(cn.cgst || 0)),
            samt: round2(Number(cn.sgst || 0)),
            csamt: 0,
          },
        },
      ] as V22Item[];
    };

    type V22CDNRNt = { nt_num: string; nt_dt: string; val: number; pos: string; inv_num: string; inv_dt: string; nt_ty: "C"; itms: V22Item[] };
    const cdnrObj = cdnr.reduce((acc: Record<string, V22CDNRNt[]>, cn) => {
      const c = cn.customerId ? customersMap.get(cn.customerId) : undefined;
      const ctin = ((c?.gstin || "") as string).trim();
      if (!ctin) return acc;
      acc[ctin] = acc[ctin] || [];
      acc[ctin].push({
        nt_num: cn.creditNoteNumber,
        nt_dt: formatDate(toDate(cn.issueDate)),
        val: cn.totalAmount,
        pos: posCode(normalizeState(c?.state || "NA")),
        inv_num: (cn.invoiceId ? (invoicesMap.get(cn.invoiceId || "")?.invoiceNumber || "") : ""),
        inv_dt: (cn.invoiceId ? (invoicesMap.get(cn.invoiceId || "")?.invoiceDate ? formatDate(invoicesMap.get(cn.invoiceId || "")!.invoiceDate!) : "") : ""),
        nt_ty: "C",
        itms: cnItms(cn),
      });
      return acc;
    }, {} as Record<string, V22CDNRNt[]>);

    const cdnurRows = cdnur.map((cn) => {
      const c = cn.customerId ? customersMap.get(cn.customerId) : undefined;
      return {
      nt_num: cn.creditNoteNumber,
      nt_dt: formatDate(toDate(cn.issueDate)),
      val: cn.totalAmount,
      pos: posCode(normalizeState(c?.state || "NA")),
      nt_ty: "C",
        itms: cnItms(cn),
      };
    });

    return {
      gstin: (company?.gstin || "").trim(),
      fp: fpVal,
      version: "GST1V2.2",
      gt: 0,
      cur_gt: 0,
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
