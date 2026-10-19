import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { buildThermalInvoiceLayout, createThermalInvoicePDF, resolveThermalInvoiceQr } from "../../lib/thermal-invoice-generator";
import type { InvoiceData } from "../../lib/invoice-generator";

const invoice: InvoiceData = {
    invoiceNumber: "KG/26-27/TEST-001", date: new Date("2026-10-19T12:00:00Z"),
    token: "invoice_12345678-1234-1234-1234-123456789abc_123456789abcdef0",
    publicUrl: "https://erp.example.com/invoice/old-path", invoiceType: "TAX_INVOICE",
    company: { name: "Khyati Precious Gems Private Limited", address: "Sample registered business address, Jaipur, Rajasthan 302001", phone: "+91 9000000000", email: "test@example.com", gstin: "TEST-GSTIN", website: "khyatigems.com" },
    customer: { name: "Sample Customer", address: "An exceptionally long address for wrapping checks, Apartment 123, Sample Street, Jaipur, Rajasthan 302001", phone: "+91 9000000001" },
    shippingAddress: "Packing department, second address, Sample Road, Jaipur 302002",
    placeOfSupply: "Rajasthan", platformInfo: { label: "DIRECT" }, platformOrderId: "TEST-ORDER-123",
    items: [{ sku: "KGLGEMDGRN60000297", hsn: "TEST-HSN", description: "Zambian Emerald Lab Grown\nCarat: 6 cts\nRatti: 6.54\nDimensions: 11 x 5.5 x 9\nShape: Oval\nCert: Sample Lab #TEST-REPORT-123", quantity: 1, displayQty: "6 cts", unitPrice: 10000, total: 10300, gstRate: 3, gstAmount: 300 }],
    grossTotal: 10500, subtotal: 10000, discount: 500, tax: 300, shippingCharge: 100, additionalCharge: 50,
    total: 10450, amountPaid: 5000, balanceDue: 5450, status: "PARTIAL", paymentStatus: "PARTIAL",
    paymentBreakdown: [{ method: "UPI", amount: 5000 }], terms: "Sample terms for testing only. Please retain the invoice for reference.",
    notes: "TEST DOCUMENT - Not a real customer invoice.",
};

async function run() {
    assert.equal(resolveThermalInvoiceQr(invoice).url, `https://erp.example.com/api/public/invoice/${invoice.token}/pdf`);
    assert(resolveThermalInvoiceQr({ ...invoice, publicUrl: "http://localhost:3000" }).warning);
    const withoutQr = buildThermalInvoiceLayout({ ...invoice, publicUrl: undefined });
    assert(withoutQr.warnings.length > 0, "Missing public QR config must be visible without blocking the receipt");
    assert(withoutQr.elements.some(element => element.kind === "text" && element.text.includes("GRAND TOTAL")));
    const one = buildThermalInvoiceLayout(invoice);
    const many = buildThermalInvoiceLayout({ ...invoice, items: Array.from({ length: 8 }, () => invoice.items[0]) });
    assert(many.height > one.height, "Receipt grows with all measured items");
    for (const width of [50, 80, 100] as const) {
        const layout = buildThermalInvoiceLayout(invoice, { paperWidth: width, profile: "detailed" });
        for (const element of layout.elements) {
            assert(element.y >= 0 && element.y + element.height <= layout.height, `${element.kind} must fit vertically on ${width} mm`);
            if (element.kind === "text") {
                const left = element.align === "center" ? element.x - element.width / 2 : element.align === "right" ? element.x - element.width : element.x;
                assert(left >= 1.9 && left + element.width <= width - 1.9, `Text stays inside ${width} mm paper: ${element.text}`);
            } else assert(element.x >= 0 && element.x + element.width <= width);
            if (element.kind === "qr") assert(element.width / (element.modules + 8) >= 3 * 25.4 / 203, "QR keeps three dots per module");
        }
        const result = await createThermalInvoicePDF(invoice, { paperWidth: width, profile: width === 50 ? "compact" : "detailed", showLogo: false });
        assert((await result.blob.text()).startsWith("%PDF-"));
        if (process.argv.includes("--render-fixtures")) {
            await mkdir("tmp/pdfs", { recursive: true });
            await writeFile(`tmp/pdfs/thermal-${width}mm.pdf`, Buffer.from(await result.blob.arrayBuffer()));
        }
    }
    const exported = { ...invoice, invoiceType: "EXPORT_INVOICE" as const, invoiceCurrency: "USD" as const, conversionRate: 100 };
    const exportLayout = buildThermalInvoiceLayout(exported, { paperWidth: 80 });
    assert(exportLayout.elements.some(element => element.kind === "text" && element.text === "USD 104.50"), "Use the saved conversion rate for export total");
    assert.throws(() => buildThermalInvoiceLayout({ ...exported, conversionRate: undefined }), /conversion rate/);
    assert.throws(() => buildThermalInvoiceLayout({ ...invoice, customer: { name: "客户" } }), /font/);
    const packing = buildThermalInvoiceLayout(invoice, { showFinancials: false, showCertification: false });
    assert(!packing.elements.some(element => element.kind === "text" && /GRAND TOTAL|Cert:/.test(element.text)));
    console.log("thermal-invoice-layout.unit.ts passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
