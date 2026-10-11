import { buildEbayStaticDescription } from "./ebay-description-html";

export type SellerHubDraftSource = {
  sku: string; title: string; categoryId: string; description: string;
  price: number; quantity: number; condition: string; imageUrls: string[];
};

// Only documented Draft-template columns. Item specifics, policies, and video
// remain in the ERP for review; eBay does not promise to import extra columns.
export function buildSellerHubDraftCsv(input: SellerHubDraftSource): string {
  if (!/^\d+$/.test(input.categoryId)) throw new Error("A numeric eBay category ID is required.");
  if (!input.title.trim() || input.title.length > 80) throw new Error("An eBay title of 1–80 characters is required.");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("A positive eBay price is required.");
  const headers = ["Action(SiteID=US|Country=IN|Currency=USD|Version=1193|CC=UTF-8)", "Custom label (SKU)", "Category ID", "Title", "UPC", "Price", "Quantity", "Item photo URL", "Condition ID", "Description", "Format"];
  const row = ["Draft", input.sku, input.categoryId, input.title, "", input.price.toFixed(2), String(input.quantity), input.imageUrls.slice(0, 24).join("|"), input.condition === "NEW" ? "NEW" : "USED", buildEbayStaticDescription(input.description).replace(/\r?\n/g, " "), "FixedPrice"];
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `${headers.map(quote).join(",")}\r\n${row.map(quote).join(",")}\r\n`;
}

export function sellerHubFeedOutcome(task: { status?: string; uploadSummary?: { successCount?: number; failureCount?: number } }) {
  const terminal = ["COMPLETED", "COMPLETED_WITH_ERROR", "ABORTED", "FAILED", "PARTIALLY_PROCESSED"].includes(task.status || "");
  // HTTP acceptance or terminal status alone never proves a draft was created.
  const success = terminal && task.uploadSummary?.successCount === 1 && task.uploadSummary?.failureCount === 0;
  return { status: task.status || "UNKNOWN", terminal, success, successCount: task.uploadSummary?.successCount ?? null, failureCount: task.uploadSummary?.failureCount ?? null };
}

export function parseSellerHubDraftReport(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  const text = csv.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (character === "," || character === "\n")) {
      row.push(value.replace(/\r$/, "")); value = "";
      if (character === "\n") { rows.push(row); row = []; }
    } else value += character;
  }
  if (value || row.length) rows.push([...row, value]);
  const headers = rows[0] || [];
  const field = (cells: string[], name: string) => (cells[headers.indexOf(name)] || "").trim();
  const result = rows.slice(1).find((cells) => field(cells, "Status") === "SUCCESS" && /^\d+$/.test(field(cells, "DraftID")));
  const draftId = result ? field(result, "DraftID") : null;
  const link = result ? field(result, "Link to complete draft") : "";
  let completeUrl: string | null = null;
  try { const url = new URL(link); if (url.protocol === "https:" && url.hostname === "www.ebay.com") completeUrl = url.href; } catch { /* no trusted link */ }
  const errors = rows.slice(1).map((cells) => field(cells, "ErrorMessage")).filter(Boolean);
  return { draftId, completeUrl, error: errors.join("; ") || null };
}
