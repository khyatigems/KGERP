import assert from "node:assert/strict";
import { getPublicInvoicePdfUrl, isValidInvoiceToken } from "../../lib/public-invoice-url";
import { servePublicInvoicePdf } from "../../lib/documents/public-invoice-pdf";
import type { InvoiceData } from "../../lib/invoice-generator";

async function run() {
  const token = "invoice_12345678-1234-1234-1234-123456789abc_123456789abcdef0";
  assert(isValidInvoiceToken(token));
  assert.equal(getPublicInvoicePdfUrl(token, "https://erp.example.com"), `https://erp.example.com/api/public/invoice/${token}/pdf`);
  for (const origin of ["http://erp.example.com", "https://localhost", "https://192.168.1.2", "https://erp.example.com/store", "https://user:pass@erp.example.com"]) {
    assert.throws(() => getPublicInvoicePdfUrl(token, origin));
  }
  let loads = 0;
  const invoice = { invoiceNumber: "TEST-1" } as InvoiceData;
  const dependencies = {
    loadInvoice: async () => { loads++; return invoice; },
    renderPdf: async (data: InvoiceData) => {
      assert.equal(data, invoice, "Render the exact loaded invoice settings");
      return { buffer: Buffer.from("%PDF-test"), fileName: "Invoice_TEST-1.pdf", mimeType: "application/pdf" };
    },
  };
  assert.equal((await servePublicInvoicePdf("bad-token", dependencies)).status, 404);
  assert.equal(loads, 0);
  assert.equal((await servePublicInvoicePdf(token, { ...dependencies, loadInvoice: async () => null })).status, 404);
  const response = await servePublicInvoicePdf(token, dependencies);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.match(response.headers.get("Content-Disposition") || "", /^attachment;/);
  assert.match(response.headers.get("Cache-Control") || "", /no-store/);
  assert.equal(await response.text(), "%PDF-test");
  console.log("public-invoice-pdf.unit.ts passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
