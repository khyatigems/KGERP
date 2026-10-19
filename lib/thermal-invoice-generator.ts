import jsPDF from "jspdf";
import QRCode from "qrcode";
import { convertNumberToWords, type InvoiceData } from "./invoice-generator";
import { getPublicInvoicePdfUrl, isValidInvoiceToken } from "./public-invoice-url";

export interface ThermalInvoiceOptions {
    paperWidth: 50 | 80 | 100;
    profile: "compact" | "detailed";
    showQr: boolean;
    showLogo: boolean;
    showFinancials: boolean;
    showCertification: boolean;
}
export const DEFAULT_THERMAL_INVOICE_OPTIONS: ThermalInvoiceOptions = {
    paperWidth: 50, profile: "compact", showQr: true, showLogo: true,
    showFinancials: true, showCertification: true,
};
export type ReceiptElement =
    | { kind: "text"; text: string; x: number; y: number; size: number; bold: boolean; align: "left" | "center" | "right"; width: number; height: number }
    | { kind: "rule"; x: number; y: number; width: number; height: number }
    | { kind: "qr"; x: number; y: number; width: number; height: number; modules: number; matrix: boolean[][] }
    | { kind: "logo"; x: number; y: number; width: number; height: number; source: string };
export interface ThermalInvoiceLayout { width: number; height: number; elements: ReceiptElement[]; warnings: string[]; }

export function resolveThermalInvoiceQr(data: InvoiceData): { url?: string; warning?: string } {
    if (!data.token || !isValidInvoiceToken(data.token)) return { warning: "Invoice download QR unavailable: this invoice has no valid public token." };
    try {
        // A server-resolved public ERP address takes precedence over a local browser origin.
        const origin = data.publicUrl ? new URL(data.publicUrl).origin : typeof window !== "undefined" ? window.location.origin : undefined;
        if (!origin) return { warning: "Configure ERP_PUBLIC_URL with the public HTTPS ERP address to enable invoice download QR codes." };
        return { url: getPublicInvoicePdfUrl(data.token, origin) };
    } catch {
        return { warning: "Invoice download QR unavailable. Configure ERP_PUBLIC_URL with your public HTTPS ERP address. The receipt can still be printed without a QR." };
    }
}

/** One measured layout drives PDF rendering and tests; no estimated receipt height. */
export function buildThermalInvoiceLayout(data: InvoiceData, input: Partial<ThermalInvoiceOptions> = {}, logoData?: string): ThermalInvoiceLayout {
    const options = { ...DEFAULT_THERMAL_INVOICE_OPTIONS, ...input };
    if (![50, 80, 100].includes(options.paperWidth)) throw new Error("Choose 50, 80 or 100 mm thermal paper.");
    const width = options.paperWidth;
    const margin = width === 50 ? 2 : 4;
    const content = width - 2 * margin;
    const base = width === 50 ? 7.5 : 9;
    const small = base - 1;
    const elements: ReceiptElement[] = [];
    const warnings: string[] = [];
    const measure = new jsPDF({ unit: "mm" });
    let y = margin;
    const detailed = options.profile === "detailed";
    const exportInvoice = data.invoiceType === "EXPORT_INVOICE";
    const currency = exportInvoice ? data.invoiceCurrency || "USD" : "INR";
    const rate = currency !== "INR" ? data.conversionRate : 1;
    if (currency !== "INR" && (!rate || !Number.isFinite(rate) || rate <= 0)) {
        throw new Error(`Set the invoice's ${currency} conversion rate before printing. INR totals cannot be labelled as foreign currency.`);
    }
    const money = (inr: number) => `${currency} ${new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(inr / (rate || 1))}`;
    const clean = (text: unknown) => String(text ?? "").replace(/₹/g, "INR ").replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, "");
    const text = (value: unknown, size = base, bold = false, align: "left" | "center" | "right" = "left", maxWidth = content, x = margin) => {
        const valueText = clean(value).trim();
        if (!valueText) return;
        // Helvetica cannot represent arbitrary Unicode; fail visibly rather than printing corrupt customer data.
        if (/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/.test(valueText)) {
            throw new Error("Thermal font does not support some invoice characters. Use the standard PDF for this invoice or use Latin text.");
        }
        measure.setFont("helvetica", bold ? "bold" : "normal");
        measure.setFontSize(size);
        const lines = measure.splitTextToSize(valueText, maxWidth) as string[];
        const height = size * 25.4 / 72 * 1.25;
        for (const line of lines) {
            elements.push({ kind: "text", text: line, x: align === "center" ? width / 2 : align === "right" ? width - margin : x, y, size, bold, align, width: measure.getTextWidth(line), height });
            y += height;
        }
        y += 0.7;
    };
    const rule = () => { y += 1; elements.push({ kind: "rule", x: margin, y, width: content, height: 0.15 }); y += 2; };
    const section = (label: string) => { rule(); text(label, small, true); };
    const pair = (label: string, value: string, bold = false, size = base) => {
        measure.setFont("helvetica", bold ? "bold" : "normal"); measure.setFontSize(size);
        const rightWidth = measure.getTextWidth(value);
        const leftWidth = measure.getTextWidth(label);
        if (rightWidth + leftWidth + 3 <= content) {
            const start = y;
            text(label, size, bold, "left");
            const end = y; y = start;
            text(value, size, bold, "right");
            y = Math.max(y, end);
        } else { text(label, small, bold); text(value, size, bold, "right"); }
    };
    if (options.showLogo && logoData) { elements.push({ kind: "logo", source: logoData, x: (width - 9) / 2, y, width: 9, height: 9 }); y += 10; }
    text("KHYATIGEMS", base + 3, true, "center");
    if (data.company.name.toLowerCase().replace(/\s/g, "") !== "khyatigems") text(data.company.name, small, true, "center");
    text(data.company.address, small, false, "center");
    if (data.company.gstin) text(`GSTIN: ${data.company.gstin}`, small, false, "center");
    text([data.company.phone, data.company.website].filter(Boolean).join(" | "), small, false, "center");
    if (detailed) text(data.company.email, small, false, "center");
    section(!options.showFinancials ? "PACKING COPY" : data.documentTitle || (exportInvoice ? "EXPORT INVOICE" : "TAX INVOICE"));
    pair(data.documentNumberLabel || "Invoice", data.invoiceNumber, true);
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) throw new Error("This invoice has an invalid invoice date.");
    pair("Date", date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }));
    if (data.platformOrderId) text(`Order: ${data.platformOrderId}`, small);
    if (data.platformInfo?.label) text(`Channel: ${data.platformInfo.label}`, small);
    section("BILL TO");
    text(data.customer.name, base, true);
    text(data.billingAddress || data.customer.address, small);
    if (data.customer.phone) text(`Phone: ${data.customer.phone}`, small);
    if (data.customer.gstin) text(`Customer GSTIN: ${data.customer.gstin}`, small);
    if (detailed && data.customer.email) text(data.customer.email, small);
    if (data.placeOfSupply && data.placeOfSupply !== "-") text(`Place of supply: ${data.placeOfSupply}`, small);
    if (data.countryOfDestination) text(`Destination: ${data.countryOfDestination}`, small);
    if (data.shippingAddress && data.shippingAddress.trim() !== (data.billingAddress || data.customer.address || "").trim()) { section("SHIP TO"); text(data.shippingAddress, small); }
    if (data.courierPartner || data.trackingId) text([data.courierPartner, data.trackingId && `Tracking: ${data.trackingId}`].filter(Boolean).join(" | "), small);
    section(`ITEM DETAILS (${data.items.length})`);
    data.items.forEach((item, index) => {
        if (index) rule();
        const [name, ...details] = item.description.split("\n");
        text(`${index + 1}. ${name}`, base, true);
        if (item.sku) text(`SKU: ${item.sku}`, base, true);
        text(`Qty: ${item.quantity}${item.displayQty && item.displayQty !== String(item.quantity) ? ` | ${item.displayQty}` : ""}`, small);
        for (const detail of details) {
            if (!options.showCertification && /^Cert:/i.test(detail.trim())) continue;
            if (!options.showFinancials && /^Rate:/i.test(detail.trim())) continue;
            text(detail, small);
        }
        if (item.hsn) text(`HSN: ${item.hsn}`, small);
        if (options.showFinancials) {
            if (detailed) {
                pair("Unit price", money(item.unitPrice), false, small);
                if (item.discountAmount) pair("Item discount", money(item.discountAmount), false, small);
                if (typeof item.gstAmount === "number") pair(`GST${item.gstRate != null ? ` (${item.gstRate}%)` : ""}`, money(item.gstAmount), false, small);
            }
            pair("Line total", money(item.total), true);
        }
    });
    if (options.showFinancials) {
        section("PAYMENT SUMMARY");
        if (data.discount > 0 && typeof data.grossTotal === "number") { pair("Before discount", money(data.grossTotal)); pair("Discount", `-${money(data.discount)}`); }
        pair("Taxable subtotal", money(data.subtotal));
        if (data.discount > 0 && typeof data.grossTotal !== "number") pair("Discount (included)", money(data.discount));
        pair("GST / tax", money(data.tax));
        if (data.shippingCharge) pair("Shipping", money(data.shippingCharge));
        if (data.additionalCharge) pair("Other charges", money(data.additionalCharge));
        for (const row of data.extraTotalRows || []) pair(row.label, money(row.amount), row.emphasis === "bold");
        rule(); pair(data.totalLabel || "GRAND TOTAL", money(data.total), true, base + 2);
        if (detailed && ["INR", "USD", "EUR"].includes(currency)) text(`In words: ${convertNumberToWords(data.total / (rate || 1), currency)}`, small);
        if (data.showPaymentSection !== false) {
            pair("Paid", money(data.amountPaid)); pair("Balance due", money(data.balanceDue), true);
            text(`Payment: ${data.paymentStatus}`, small, true);
            for (const payment of data.paymentBreakdown || []) pair(payment.method, money(payment.amount), false, small);
            if (data.paymentMethod && !data.paymentBreakdown?.length) text(`Method: ${data.paymentMethod}`, small);
        }
    }
    if (detailed && data.showBankDetailsSection !== false && data.bankDetails) { section("BANK DETAILS"); text(`${data.bankDetails.bankName}\nA/c: ${data.bankDetails.accountNumber}\nIFSC: ${data.bankDetails.ifsc}\n${data.bankDetails.holder}`, small); }
    if (exportInvoice) {
        if (data.iecCode) text(`IEC: ${data.iecCode}`, small);
        if (data.exportType) text(`Export profile: ${data.exportType}`, small);
        if (data.portOfDispatch) text(`Port: ${data.portOfDispatch}`, small);
        if (data.modeOfTransport) text(`Transport: ${data.modeOfTransport}`, small);
        if (data.exportTerms) { section("EXPORT TERMS"); text(data.exportTerms, small); }
    }
    if (data.terms) { section("TERMS"); text(data.terms, small); }
    if (data.notes) { section("NOTES"); text(data.notes, small); }
    rule(); text("Thank you for choosing KhyatiGems!", small, true, "center");
    if (options.showQr) {
        const target = resolveThermalInvoiceQr(data);
        if (target.warning) warnings.push(target.warning);
        if (target.url) {
            const code = QRCode.create(target.url, { errorCorrectionLevel: "M" });
            const size = Math.max(24, (code.modules.size + 8) * 3 * 25.4 / 203);
            if (size > content) throw new Error("The invoice download QR is too large for this paper profile. Select wider paper.");
            const matrix = Array.from({ length: code.modules.size }, (_, row) => Array.from({ length: code.modules.size }, (_, col) => Boolean(code.modules.get(row, col))));
            y += 2; elements.push({ kind: "qr", x: (width - size) / 2, y, width: size, height: size, modules: code.modules.size, matrix }); y += size + 1;
            text("Scan to download your invoice PDF", small, false, "center");
        }
    }
    const height = Math.ceil(y + margin + 3);
    if (height > 1400) throw new Error("This receipt exceeds the supported roll length. Use the standard multi-page PDF for this invoice.");
    return { width, height, elements, warnings };
}

async function loadMonochromeLogo(source: string): Promise<string | undefined> {
    if (typeof document === "undefined") return undefined;
    return new Promise(resolve => {
        const image = new Image(); image.crossOrigin = "anonymous";
        const timeout = setTimeout(() => resolve(undefined), 4000);
        image.onerror = () => { clearTimeout(timeout); resolve(undefined); };
        image.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement("canvas"); canvas.width = 180; canvas.height = 180;
                const context = canvas.getContext("2d"); if (!context) return resolve(undefined);
                context.fillStyle = "white"; context.fillRect(0, 0, 180, 180);
                const scale = Math.min(180 / image.width, 180 / image.height);
                context.drawImage(image, (180 - image.width * scale) / 2, (180 - image.height * scale) / 2, image.width * scale, image.height * scale);
                const pixels = context.getImageData(0, 0, 180, 180);
                for (let i = 0; i < pixels.data.length; i += 4) { const value = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114 < 185 ? 0 : 255; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; }
                context.putImageData(pixels, 0, 0); resolve(canvas.toDataURL("image/png"));
            } catch { resolve(undefined); }
        };
        image.src = source;
    });
}
export async function createThermalInvoicePDF(data: InvoiceData, options: Partial<ThermalInvoiceOptions> = {}) {
    const logo = options.showLogo !== false && data.company.logoUrl ? await loadMonochromeLogo(data.company.logoUrl) : undefined;
    const layout = buildThermalInvoiceLayout(data, options, logo);
    if (data.company.logoUrl && options.showLogo !== false && !logo) layout.warnings.push("Company logo could not be loaded; the company name is printed instead.");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [layout.width, layout.height], compress: true });
    for (const element of layout.elements) {
        if (element.kind === "text") { doc.setFont("helvetica", element.bold ? "bold" : "normal"); doc.setFontSize(element.size); doc.text(element.text, element.x, element.y, { align: element.align, baseline: "top" }); }
        else if (element.kind === "rule") { doc.setLineWidth(0.15); doc.line(element.x, element.y, element.x + element.width, element.y); }
        else if (element.kind === "logo") doc.addImage(element.source, "PNG", element.x, element.y, element.width, element.height);
        else { const moduleSize = element.width / (element.modules + 8); doc.setFillColor(0, 0, 0); element.matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) doc.rect(element.x + (c + 4) * moduleSize, element.y + (r + 4) * moduleSize, moduleSize, moduleSize, "F"); })); }
    }
    return { blob: doc.output("blob"), layout, fileName: `Invoice-${data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}-Thermal.pdf` };
}
export async function generateThermalInvoicePDF(data: InvoiceData, options: Partial<ThermalInvoiceOptions> = {}) {
    const result = await createThermalInvoicePDF(data, options);
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a"); link.href = url; link.download = result.fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return result;
}
