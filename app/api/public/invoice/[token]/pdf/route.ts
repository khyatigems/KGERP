import { buildPublicInvoiceData } from "@/lib/documents/invoice-data";
import { generateInvoicePdfBuffer } from "@/lib/documents/invoice-service";
import { servePublicInvoicePdf } from "@/lib/documents/public-invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return servePublicInvoicePdf(token, {
    loadInvoice: buildPublicInvoiceData,
    renderPdf: generateInvoicePdfBuffer,
  });
}
