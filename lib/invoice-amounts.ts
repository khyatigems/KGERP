/** Invoice totals are stored in INR by the sales workflow and PDF generator. */
export function invoiceAmounts(invoice: { totalAmount: number; invoiceCurrency: string | null; conversionRate: number | null; invoiceType?: string }) {
 const currency = ["TAX", "TAX_INVOICE"].includes(invoice.invoiceType || "") ? "INR" : invoice.invoiceCurrency?.trim().toUpperCase() || "INR";
 const foreign = currency !== "INR";
 const validRate = invoice.conversionRate !== null && Number.isFinite(invoice.conversionRate) && invoice.conversionRate > 0;
 return { currency, amount: foreign ? validRate ? invoice.totalAmount / invoice.conversionRate! : null : invoice.totalAmount, inrAmount: invoice.totalAmount };
}
