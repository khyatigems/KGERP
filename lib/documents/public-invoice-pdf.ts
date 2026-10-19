import type { InvoiceData } from "@/lib/invoice-generator";
import type { InvoicePdfResult } from "@/lib/documents/invoice-service";
import { isValidInvoiceToken } from "@/lib/public-invoice-url";

type PublicInvoicePdfDependencies = {
  loadInvoice: (token: string) => Promise<InvoiceData | null>;
  renderPdf: (data: InvoiceData) => Promise<InvoicePdfResult>;
};

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

/** A bearer token is the only public lookup key. Never accept an invoice ID. */
export async function servePublicInvoicePdf(token: string, dependencies: PublicInvoicePdfDependencies): Promise<Response> {
  const unavailable = () => new Response("This invoice download link is unavailable.", {
    status: 404,
    headers: PRIVATE_HEADERS,
  });
  if (!isValidInvoiceToken(token)) return unavailable();
  try {
    const data = await dependencies.loadInvoice(token);
    if (!data) return unavailable();
    const pdf = await dependencies.renderPdf(data);
    // Defence in depth: the renderer's filename must never become a header value verbatim.
    const fileName = pdf.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160);
    return new Response(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdf.buffer.length),
      },
    });
  } catch {
    // Do not log the bearer token or customer data from failed download requests.
    console.error("Public invoice PDF generation failed.");
    return new Response("Unable to generate this invoice PDF. Please try again shortly.", {
      status: 503,
      headers: { ...PRIVATE_HEADERS, "Retry-After": "30" },
    });
  }
}
