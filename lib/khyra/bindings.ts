/** Only these existing producer identities are connected automatically. Never guess outcomes from arbitrary prose. */
export const KHYRA_SAVED_BINDINGS = [
  { prefix: "inventory-created:", type: "success", event: "inventory.create.completed" },
  { prefix: "purchase-created:", type: "success", event: "purchases.create.completed" },
  { prefix: "quotation-created:", type: "success", event: "quotations.create.completed" },
  { prefix: "sale-created:", type: "success", event: "sales.create.completed" },
  { prefix: "invoice-created:", type: "success", event: "invoices.create.completed" },
  { prefix: "invoice-payment:", type: "success", event: "payments.record.completed" },
  { prefix: "report-export:", suffix: ":completed", type: "success", event: "reports.export.completed" },
  { prefix: "report-export:", suffix: ":failed", type: "error", event: "reports.export.failed" },
  { prefix: "marketplace-sync:", type: "error", event: "marketplace.sync.issue" },
] as const;

/** Exact existing call-site messages: no fuzzy error matching or inferred transactions. */
export const KHYRA_FEEDBACK_BINDINGS: ReadonlyArray<{ text: string; type: string; event: string }> = [
  { text: "Quotation saved successfully", type: "success", event: "quotations.create.completed" },
  { text: "Quotation cancelled", type: "success", event: "quotations.cancel.completed" },
  { text: "Quotation sent", type: "success", event: "quotations.send.completed" },
  { text: "Converted to Invoice", type: "success", event: "quotations.convert.completed" },
  { text: "Purchase created successfully", type: "success", event: "purchases.create.completed" },
  { text: "Purchase updated successfully", type: "success", event: "purchases.update.completed" },
  { text: "Sale created successfully. Invoice Generated.", type: "success", event: "sales.create.completed" },
  { text: "Invoice created successfully", type: "success", event: "invoices.create.completed" },
  { text: "Inventory created successfully", type: "success", event: "inventory.create.completed" },
  { text: "Inventory updated successfully", type: "success", event: "inventory.update.completed" },
  { text: "Items updated successfully", type: "success", event: "inventory.bulk_update.completed" },
  { text: "Image uploaded successfully", type: "success", event: "media.upload.completed" },
  { text: "Export job queued. Track its progress in Recent Jobs.", type: "success", event: "reports.queue.completed" },
  { text: "Note created", type: "success", event: "notes.create.completed" },
  { text: "Note updated", type: "success", event: "notes.update.completed" },
  { text: "Settings updated successfully", type: "success", event: "settings.update.completed" },
  { text: "Settings saved successfully", type: "success", event: "settings.update.completed" },
];
