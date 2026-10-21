import assert from "node:assert/strict";
import { invoiceAmounts } from "@/lib/invoice-amounts";
assert.deepEqual(invoiceAmounts({ totalAmount: 2217.2, invoiceCurrency: "USD", conversionRate: 92 }), { currency: "USD", amount: 24.099999999999998, inrAmount: 2217.2 });
assert.equal(invoiceAmounts({ totalAmount: 4968, invoiceCurrency: "USD", conversionRate: 92 }).amount, 54);
assert.deepEqual(invoiceAmounts({ totalAmount: 100, invoiceCurrency: "INR", conversionRate: null }), { currency: "INR", amount: 100, inrAmount: 100 });
assert.equal(invoiceAmounts({ totalAmount: 100, invoiceCurrency: "USD", conversionRate: 80, invoiceType: "TAX_INVOICE" }).currency, "INR", "tax invoices follow the INR document convention even with a legacy foreign-currency field");
for (const rate of [null, 0, -1, NaN]) assert.equal(invoiceAmounts({ totalAmount: 100, invoiceCurrency: "USD", conversionRate: rate }).amount, null);
console.log("Invoice amount tests passed: saved-rate conversion, INR reference and missing-rate handling.");
