import assert from "node:assert/strict";
import { buildEbayStaticDescription } from "../../lib/marketplace/ebay-description-html";
import { buildSellerHubDraftCsv, sellerHubFeedOutcome, parseSellerHubDraftReport } from "../../lib/marketplace/ebay-seller-hub-draft";

const csv = buildSellerHubDraftCsv({ sku: "TEST", title: 'Green, "Oval" Gem', categoryId: "262027", description: '<p>A "green" gemstone</p>\n<p>Full HTML</p>', price: 85, quantity: 1, condition: "NEW", imageUrls: ["https://example.test/photo.jpg"] });
const staticHtml = buildEbayStaticDescription('<script>alert(1)</script><p onclick="bad()" style="color:blue;background:url(javascript:bad())">Gem</p><img src="https://example.test/gem.jpg" onerror="bad()"><a href="java&#115;cript:bad()">link</a><iframe src="https://example.test"></iframe>');
assert.ok(!/script|onclick|onerror|iframe|background:/i.test(staticHtml));
assert.match(staticHtml, /color:blue/);
assert.match(staticHtml, /https:\/\/example.test\/gem.jpg/);
assert.match(staticHtml, /Gem/);
assert.match(csv, /Action\(SiteID=US\|Country=IN\|Currency=USD/);
assert.match(csv, /"Draft","TEST"/);
assert.ok(!csv.includes('"Add"'));
assert.match(csv, /Green, ""Oval"" Gem/);
assert.match(csv, /<p>A ""green"" gemstone<\/p>/);
assert.ok(csv.endsWith("\r\n"));
assert.equal(sellerHubFeedOutcome({ status: "QUEUED", uploadSummary: { successCount: 0, failureCount: 0 } }).success, false);
assert.equal(sellerHubFeedOutcome({ status: "COMPLETED_WITH_ERROR", uploadSummary: { successCount: 0, failureCount: 1 } }).success, false);
assert.equal(sellerHubFeedOutcome({ status: "COMPLETED" }).success, false);
assert.equal(sellerHubFeedOutcome({ status: "COMPLETED", uploadSummary: { successCount: 1, failureCount: 0 } }).success, true);
const report = '\uFEFFLineNumber,DraftID,Title,Status,Link to complete draft,ErrorCode,ErrorMessage\n1,5387189153310,,SUCCESS,https://www.ebay.com/sl/list?mode=AddItem&draft_id=5387189153310,\n        ,\n';
assert.equal(parseSellerHubDraftReport(report).draftId, "5387189153310");
assert.match(parseSellerHubDraftReport(report).completeUrl!, /draft_id=5387189153310/);
assert.equal(parseSellerHubDraftReport(report.replace("www.ebay.com", "example.test")).completeUrl, null);
assert.equal(parseSellerHubDraftReport('LineNumber,DraftID,Title,Status,Link to complete draft,ErrorCode,ErrorMessage\n1,,,FAILURE,,123,"Invalid category, reload it"\n').error, "Invalid category, reload it");

async function main() {
  const { prisma } = await import("../../lib/prisma");
  const { encryptSecret } = await import("../../lib/security/secret-store");
  const { EbayConnector } = await import("../../lib/marketplace/connectors/ebay");
  const originalFind = prisma.marketplaceConnection.findUnique;
  const originalFetch = globalThis.fetch;
  const priorKey = process.env.ERP_SECRET_ENCRYPTION_KEY;
  const priorEnvironment = process.env.EBAY_ENVIRONMENT;
  process.env.ERP_SECRET_ENCRYPTION_KEY = "seller-hub-test-only";
  process.env.EBAY_ENVIRONMENT = "production";
  const tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
  try {
    prisma.marketplaceConnection.findUnique = (async () => ({ tokenRef })) as unknown as typeof originalFind;
    let uploads = 0;
    globalThis.fetch = async (url, init) => {
      const path = String(url);
      assert.ok(!path.includes("/publish"));
      assert.ok(!path.includes("/inventory_item/"));
      if (path.endsWith("/sell/feed/v1/task")) {
        assert.deepEqual(JSON.parse(String(init?.body)), { feedType: "FX_DRAFT", schemaVersion: "1.0" });
        return new Response(null, { status: 202, headers: { location: "https://api.ebay.com/sell/feed/v1/task/task-test" } });
      }
      if (path.endsWith("/upload_file")) {
        uploads += 1;
        const body = init?.body as FormData;
        assert.equal(await (body.get("file") as Blob).text(), csv);
        return new Response(null, { status: 200 });
      }
      if (path.endsWith("/download_result_file")) return new Response(report);
      return Response.json({ feedType: "FX_DRAFT", status: "COMPLETED", uploadSummary: { successCount: 1, failureCount: 0 } });
    };
    const connector = new EbayConnector();
    const task = await connector.createSellerHubDraftTask("test");
    assert.equal(task, "task-test");
    await connector.uploadSellerHubDraft("test", task, csv);
    assert.equal(uploads, 1);
    assert.equal((await connector.getSellerHubDraftTask("test", task)).success, true);
    assert.equal(parseSellerHubDraftReport(await connector.getSellerHubDraftResult("test", task)).draftId, "5387189153310");
    globalThis.fetch = async () => { uploads += 1; return Response.json({ errors: [{ message: "Upload failed" }] }, { status: 500 }); };
    await assert.rejects(connector.uploadSellerHubDraft("test", task, csv), /Upload failed/);
    assert.equal(uploads, 2, "Failed uploads must not be retried automatically");
    const { submitSellerHubDraft } = await import("../../lib/marketplace/ebay-seller-hub-service");
    const originalListingFind = prisma.listing.findFirst;
    const originalListingUpdateMany = prisma.listing.updateMany;
    const originalListingUpdate = prisma.listing.update;
    const originalScope = EbayConnector.prototype.ensureInventoryWriteScope;
    let storedMetadata = JSON.stringify({ description: "Saved HTML", ebayTaxonomy: { categoryId: "262027", marketplaceId: "EBAY_US" }, mediaAssets: [] });
    let createdTasks = 0;
    try {
      prisma.listing.findFirst = (async () => ({ id: "saved-test", rawMetadata: storedMetadata, currency: "USD", listedPrice: 85, marketplaceTitle: "Test gemstone", listingSku: "TEST", marketplaceQuantity: 1, inventory: { condition: "New" }, marketplaceShop: { connectionId: "test", connection: { scopes: "scope" } } })) as unknown as typeof originalListingFind;
      prisma.listing.updateMany = (async (args: { where: { rawMetadata: string }; data: { rawMetadata: string } }) => {
        if (args.where.rawMetadata !== storedMetadata) return { count: 0 };
        storedMetadata = args.data.rawMetadata; return { count: 1 };
      }) as unknown as typeof originalListingUpdateMany;
      prisma.listing.update = (async (args: { data: { rawMetadata: string } }) => { storedMetadata = args.data.rawMetadata; return {}; }) as unknown as typeof originalListingUpdate;
      EbayConnector.prototype.ensureInventoryWriteScope = async () => true;
      globalThis.fetch = async (url) => {
        if (String(url).endsWith("/sell/feed/v1/task")) { createdTasks += 1; return new Response(null, { status: 202, headers: { location: "https://api.ebay.com/sell/feed/v1/task/task-test" } }); }
        if (String(url).endsWith("/upload_file")) return new Response(null, { status: 200 });
        if (String(url).endsWith("/download_result_file")) return new Response(report);
        return Response.json({ feedType: "FX_DRAFT", status: "COMPLETED", uploadSummary: { successCount: 1, failureCount: 0 } });
      };
      assert.equal((await submitSellerHubDraft("saved-test", "shop-test")).success, true);
      assert.equal((await submitSellerHubDraft("saved-test", "shop-test")).success, true);
      assert.equal(createdTasks, 1, "Repeated saves check the existing upload instead of creating another draft");
      storedMetadata = JSON.stringify({ description: "Saved HTML", ebayTaxonomy: { categoryId: "262027", marketplaceId: "EBAY_US" }, mediaAssets: [], sellerHubDraft: { taskId: "task-test", state: "PROCESSING" } });
      globalThis.fetch = async () => Response.json({ feedType: "FX_DRAFT", status: "COMPLETED", uploadSummary: { successCount: 1, failureCount: 0 } });
      assert.equal((await submitSellerHubDraft("saved-test", "shop-test")).success, false, "A summary without a valid DraftID report is not success");
    } finally {
      prisma.listing.findFirst = originalListingFind;
      prisma.listing.updateMany = originalListingUpdateMany;
      prisma.listing.update = originalListingUpdate;
      EbayConnector.prototype.ensureInventoryWriteScope = originalScope;
    }
  } finally {
    prisma.marketplaceConnection.findUnique = originalFind;
    globalThis.fetch = originalFetch;
    if (priorKey === undefined) delete process.env.ERP_SECRET_ENCRYPTION_KEY; else process.env.ERP_SECRET_ENCRYPTION_KEY = priorKey;
    if (priorEnvironment === undefined) delete process.env.EBAY_ENVIRONMENT; else process.env.EBAY_ENVIRONMENT = priorEnvironment;
  }
  console.log("eBay Seller Hub draft regression tests passed.");
}
void main();
