import { generateInvoicePDF, type InvoiceData } from "@/lib/invoice-generator";

export interface InvoicePdfResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120);
}

/**
 * Canonical invoice PDF generator (server-safe). Reuses the single existing
 * invoice renderer so download and email attachment share one format.
 */
export async function generateInvoicePdfBuffer(data: InvoiceData): Promise<InvoicePdfResult> {
  const output = await generateInvoicePDF(data, "arraybuffer");
  const buffer = Buffer.from(output);
  const fileName = `Invoice_${sanitizeFileName(data.invoiceNumber)}.pdf`;
  return { buffer, fileName, mimeType: "application/pdf" };
}
