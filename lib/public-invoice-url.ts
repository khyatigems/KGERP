/** Public invoice links use the ERP host, never the company's storefront URL. */
export function isValidInvoiceToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,256}$/.test(token);
}

/** Best available configured origin for this ERP instance (server side). */
export function getErpPublicOrigin(): string | undefined {
  if (typeof window === "undefined") {
    return (process.env.ERP_PUBLIC_URL || process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "")
      .trim()
      .replace(/\/+$/, "") || undefined;
  }
  return window.location.origin;
}

/**
 * The invoice QR hands the customer the PDF directly. Reject local or invalid
 * origins so an unusable customer download link is never printed.
 */
export function getPublicInvoiceQrUrl(token: string): string | undefined {
  if (!isValidInvoiceToken(token)) return undefined;
  const origin = getErpPublicOrigin();
  if (!origin) return undefined;
  return getPublicInvoicePdfUrl(token, origin);
}

export function getPublicInvoicePdfPath(token: string): string {
  if (!isValidInvoiceToken(token)) throw new Error("Invalid invoice download token.");
  return `/api/public/invoice/${encodeURIComponent(token)}/pdf`;
}

export function getPublicInvoicePdfUrl(token: string, erpOrigin: string): string {
  let origin: URL;
  try {
    origin = new URL(erpOrigin);
  } catch {
    throw new Error("Set ERP_PUBLIC_URL to the public HTTPS address of this ERP before printing invoice QR codes.");
  }
  const host = origin.hostname.toLowerCase();
  const isPrivateHost = host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || !host.includes(".") || host.includes(":") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (origin.protocol !== "https:" || origin.username || origin.password || isPrivateHost ||
      (origin.pathname !== "/" && origin.pathname !== "") || origin.search || origin.hash) {
    throw new Error("Invoice QR codes need a public HTTPS ERP address. Configure ERP_PUBLIC_URL; a local address cannot be opened by customers.");
  }
  return new URL(getPublicInvoicePdfPath(token), origin.origin).toString();
}
