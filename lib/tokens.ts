import crypto from "node:crypto";

export function generatePublicToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}_${crypto.randomBytes(8).toString("hex")}`;
}

export function generateQuotationToken() {
  return generatePublicToken("quote");
}

export function generateInvoiceToken() {
  return generatePublicToken("invoice");
}
