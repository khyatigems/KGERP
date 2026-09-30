-- A purchase must never appear twice under the same purchase number.
-- Deploy only after removing duplicate invoice numbers (see purchase register fix).
CREATE UNIQUE INDEX "Purchase_invoiceNo_key" ON "Purchase"("invoiceNo");
