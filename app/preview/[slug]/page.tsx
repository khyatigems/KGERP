import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { getPublicLabelData } from "@/app/erp/packaging/actions";
import { SkuPreviewContent } from "@/components/preview/sku-preview-content";
import { trackPublicView } from "@/lib/analytics";
import { resolveInventoryCertificateUrl } from "@/lib/certificate-url";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type PreviewQrPaymentAuthorization = {
  enabled: boolean;
  totalAmount: number;
  paidAmount: number;
  amountToCollect: number;
  allowPartial: boolean;
};

async function findPreviewQrPaymentAuthorization(inventoryId: string): Promise<PreviewQrPaymentAuthorization | null> {
  // A long-running Next dev worker can retain a Prisma client generated before
  // the QR payment model was added. Use the model delegate when present, while
  // keeping the public product page readable through Prisma's raw query API.
  const delegate = (prisma as unknown as {
    inventoryQrPaymentAuthorization?: {
      findUnique(args: { where: { inventoryId: string } }): Promise<PreviewQrPaymentAuthorization | null>;
    };
  }).inventoryQrPaymentAuthorization;

  if (typeof delegate?.findUnique === "function") {
    return delegate.findUnique({ where: { inventoryId } });
  }

  const rows = await prisma.$queryRaw<Array<PreviewQrPaymentAuthorization>>`
    SELECT "enabled", "totalAmount", "paidAmount", "amountToCollect", "allowPartial"
    FROM "InventoryQrPaymentAuthorization"
    WHERE "inventoryId" = ${inventoryId}
    LIMIT 1
  `;
  const row = rows[0];
  return row
    ? {
      enabled: Boolean(row.enabled),
      totalAmount: Number(row.totalAmount),
      paidAmount: Number(row.paidAmount),
      amountToCollect: Number(row.amountToCollect),
      allowPartial: Boolean(row.allowPartial),
    }
    : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const serialRes = await getPublicLabelData(slug);
  if (serialRes.success && serialRes.data) {
    return { title: "Packaging Label Preview | KhyatiGems", description: `Label preview for ${serialRes.data.serial}` };
  }

  const item = await prisma.inventory.findUnique({ where: { sku: slug }, select: { itemName: true } });
  return { title: item ? `${item.itemName} | KhyatiGems` : "Gemstone Not Found | KhyatiGems" };
}

const descriptionSanitizerOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "a", "address", "article", "b", "blockquote", "br", "caption", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "hr", "i", "img", "li", "ol", "p", "section", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  exclusiveFilter(frame) {
    const text = frame.text.replace(/\s+/g, " ").trim().toLowerCase();
    const startsLike = (label: string) => text.replace(/^[^a-z0-9]+/i, "").startsWith(label);

    // The preview already presents these facts in the product header/specification list.
    // Filter them at render time only; the source eBay description remains untouched.
    if (frame.tag === "h1" || frame.tag === "table") return true;
    if (frame.tag === "img") {
      const imageIdentity = `${frame.attribs.alt || ""} ${frame.attribs.title || ""} ${frame.attribs.src || ""}`.toLowerCase();
      if (/logo/.test(imageIdentity)) return true;
    }
    if (frame.tag === "p" && text.includes("sku") && text.includes("product type") && text.includes("weight")) return true;
    if (frame.tag === "div" && [
      "welcome to khyatigems",
      "product specifications",
      "certification",
      "origin & treatment",
      "store policies & buying information",
      "closing note",
    ].some(startsLike)) return true;

    return false;
  },
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
};

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  await ensureInventoryQrPaymentSchema();

  const serialRes = await getPublicLabelData(slug);
  if (serialRes.success && serialRes.data) {
    const source = typeof sp.source === "string" ? sp.source : (Array.isArray(sp.source) ? sp.source[0] : undefined);
    const query = source ? `?source=${encodeURIComponent(source)}` : "";
    redirect(`/verify/${encodeURIComponent(slug)}${query}`);
  }

  const item = await prisma.inventory.findUnique({
    where: { sku: slug },
    select: {
      id: true,
      sku: true, itemName: true, status: true, gemType: true, stoneType: true,
      description: true, productDescription: true, certificateComments: true, weightValue: true, weightUnit: true,
      carats: true, weightRatti: true, certificateNo: true, certificateNumber: true,
      certification: true, lab: true, certificateLab: true, shape: true, color: true,
      clarity: true, clarityGrade: true, cut: true, cutGrade: true, polish: true,
      symmetry: true, fluorescence: true, measurements: true, dimensionsMm: true,
      origin: true, originCountry: true, treatment: true, transparency: true,
      pricingMode: true, sellingRatePerCarat: true, flatSellingPrice: true,
      imageUrl: true, videoUrl: true,
      colorCode: { select: { name: true } },
      gemstoneCode: { select: { name: true } },
      cutCode: { select: { name: true } },
      media: { select: { id: true, type: true, mediaUrl: true, isPrimary: true }, orderBy: { createdAt: "asc" } },
      certificates: { select: { id: true, name: true, remarks: true } },
    },
  });

  if (!item) notFound();
  await trackPublicView("SKU_VIEW", item.id, item.sku, sp);

  const [company, invoiceSales, paymentSettings, qrPayment] = await Promise.all([
    prisma.companySettings.findFirst({ select: { phone: true, email: true } }),
    prisma.sale.findMany({
      where: { inventoryId: item.id },
      select: {
        invoice: { select: { token: true, status: true, isActive: true, paymentStatus: true, totalAmount: true, paidAmount: true, sales: { select: { inventoryId: true } } } },
        legacyInvoice: { select: { token: true, status: true, isActive: true, paymentStatus: true, totalAmount: true, paidAmount: true, legacySale: { select: { inventoryId: true } } } },
      },
      orderBy: { saleDate: "desc" },
      take: 10,
    }),
    prisma.paymentSettings.findFirst({ select: { upiEnabled: true, upiId: true, bankEnabled: true, razorpayEnabled: true, razorpayButtonId: true, razorpayKeyId: true, razorpayKeySecret: true } }),
    findPreviewQrPaymentAuthorization(item.id),
  ]);

  const isPerCarat = item.pricingMode === "PER_CARAT";
  const rate = isPerCarat ? item.sellingRatePerCarat : item.flatSellingPrice;
  const totalAmount = isPerCarat ? (item.weightValue || 0) * (item.sellingRatePerCarat || 0) : item.flatSellingPrice || 0;
  const hasPaymentMethod = Boolean(
    (paymentSettings?.upiEnabled && paymentSettings.upiId) ||
    paymentSettings?.bankEnabled ||
    (paymentSettings?.razorpayEnabled && paymentSettings.razorpayButtonId)
  );
  const qrPaymentDue = qrPayment ? Number((qrPayment.totalAmount - qrPayment.paidAmount).toFixed(2)) : 0;
  const qrPaymentAmount = qrPayment?.enabled && ["IN_STOCK", "RESERVED"].includes(item.status.toUpperCase()) && paymentSettings?.razorpayEnabled && paymentSettings.razorpayKeyId?.trim() && paymentSettings.razorpayKeySecret?.trim() && qrPaymentDue >= 1 && qrPayment.amountToCollect >= 1 && (qrPayment.allowPartial || qrPayment.amountToCollect >= qrPaymentDue - 0.01)
    ? Math.min(qrPayment.amountToCollect, qrPaymentDue)
    : null;
  const payableInvoice = ["IN_STOCK", "RESERVED"].includes(item.status.toUpperCase()) && hasPaymentMethod
    ? invoiceSales.flatMap((sale) => [sale.invoice, sale.legacyInvoice]).find((invoice) => {
      if (!invoice || !invoice.isActive || invoice.status !== "ISSUED") return false;
      if (!["UNPAID", "PARTIAL"].includes(invoice.paymentStatus.toUpperCase())) return false;
      if (invoice.totalAmount - invoice.paidAmount <= 0.01) return false;
      const invoiceItems = "sales" in invoice ? invoice.sales : invoice.legacySale ? [invoice.legacySale] : [];
      return invoiceItems.length === 1 && invoiceItems[0]?.inventoryId === item.id;
    })
    : undefined;
  const payNowUrl = qrPaymentAmount === null && payableInvoice ? `/invoice/${encodeURIComponent(payableInvoice.token)}` : null;
  const rawDescription = item.productDescription || item.description || "";
  const descriptionHtml = sanitizeHtml(rawDescription, descriptionSanitizerOptions);
  const certificateUrl = resolveInventoryCertificateUrl({
    certification: item.certification,
    certificateComments: item.certificateComments,
    certificateNumber: item.certificateNumber,
    certificateNo: item.certificateNo,
    certificates: item.certificates,
  });
  const { id: internalId, description: _internalDescription, productDescription: _internalProductDescription, certificateComments: _internalCertificateComments, ...publicItem } = item;
  void internalId;
  void _internalDescription;
  void _internalProductDescription;
  void _internalCertificateComments;

  return <SkuPreviewContent item={publicItem} companySettings={company} rate={rate || 0} totalAmount={totalAmount || 0} isPerCarat={isPerCarat} descriptionHtml={descriptionHtml} payNowUrl={payNowUrl} qrPaymentAmount={qrPaymentAmount} qrPaymentDue={qrPaymentDue} qrAllowPartial={Boolean(qrPayment?.allowPartial)} certificateUrl={certificateUrl} />;
}
