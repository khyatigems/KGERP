export function getInvoiceDisplayDate(invoice: { invoiceDate?: Date | null; createdAt: Date }) {
  return invoice.invoiceDate || invoice.createdAt;
}

