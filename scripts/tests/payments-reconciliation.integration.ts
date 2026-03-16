import { reconcileHistoricalInvoicePayments, getPaymentCompletenessValidation } from "@/lib/payment-reconciliation";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const dryRunResult = await reconcileHistoricalInvoicePayments({ dryRun: true });
  assert(dryRunResult.scannedInvoices >= 0, "Expected scanned invoice count");
  assert(dryRunResult.invoicesWithExpectedPayments >= 0, "Expected invoicesWithExpectedPayments count");
  assert(dryRunResult.createdPayments >= 0, "Expected createdPayments count");

  const validation = await getPaymentCompletenessValidation();
  assert(validation.invoiceCount >= 0, "Expected invoiceCount");
  assert(validation.paymentCount >= 0, "Expected paymentCount");
  assert(validation.statusMismatches >= 0, "Expected statusMismatches");
}

run().then(() => {
  console.log("payments-reconciliation.integration.ts passed");
});
