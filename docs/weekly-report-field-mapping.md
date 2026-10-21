# Weekly BI audit and verified metric mapping

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind, Zod, Prisma 5.22, SQLite/Turso (`lib/prisma.ts`). No Drizzle configuration is present. Existing migrations and additive runtime initialization will be used. Preserve in-progress Work Tracker changes.

| Metric | Verified source | Rule / coverage |
|---|---|---|
| Unique physical SKUs | Inventory.id, sku (@unique) | Count physical inventory once; listings never multiply this count. |
| Current availability | Inventory.status | Current snapshot, not historical week-end reconstruction. Reserved/inactive statuses only where present. |
| Gemstone breakdown | Inventory.gemType / gemstoneCodeId | Unknown explicitly grouped. |
| Cost / asking valuation | Inventory.costPrice, sellingPrice, pieces | Sum per physical SKU once; cost and asking-price valuation shown separately; no assumed per-piece multiplication. Currency assumptions disclosed. |
| Product sales during week | Sale.inventoryId, saleDate | Distinct physical SKU sold; Sale is not an order. Sales rows have no verified unit quantity. |
| ERP sales ledger | Sale.salePrice, discountAmount, taxAmount, netAmount, shippingCharge, additionalCharge, invoiceId | Separate from imported marketplace order totals; do not add overlapping ledgers. Invoice currency handling requires verified mapping. |
| Weekly issued invoices | Invoice.id, isActive, status, invoiceDate, createdAt, invoiceType, paymentStatus, totalAmount | Exclude draft/cancelled/void/inactive. Use invoiceDate, createdAt only when null. Count once per invoice. totalAmount is stored INR per sales/actions.ts and invoice-generator.ts; separate ledger, never added to marketplace totals. Compare count and recorded INR value with prior week. Unpaid is current payment status of period invoices, not historic week-end receivables. |
| Dashboard foreign invoice display | Invoice.totalAmount, invoiceCurrency, conversionRate | Original-currency amount = stored INR totalAmount / positive saved conversionRate. Show INR totalAmount in brackets. Missing/invalid rate shows conversion unavailable; never relabel the INR amount with a foreign symbol. |
| Orders | MarketplaceOrder.marketplaceOrderId, marketplace, marketplaceShopId, orderDate | Deduplicate by platform + external order ID; preserve shop assignment conflicts as a warning. Half-open date range. Missing orderDate not replaced by import date. |
| Units | MarketplaceOrderItem.quantity | Sum line quantities for eligible unique orders, not row counts. |
| Marketplace recorded order value | MarketplaceOrder.orderTotal, currency, status | Original currency; known cancelled/refunded/unpaid orders excluded. Not profit, settlement or guaranteed payment. Gross merchandise, tax, shipping, discount and refund amounts unavailable without structured evidence. |
| Refunds / cancellations | MarketplaceOrder.status; SalesReturn.returnDate,totalAmount,items.quantity | Recognized marketplace status matches only; complete counts and amounts unavailable. eBay status is fulfillment status, not payment/refund evidence. ERP returns reported as separate ledger, not subtracted from marketplace totals. |
| Active marketplace listings | Listing.externalId, platform, marketplaceShopId, status | Count distinct IDs within `(platform, shopId)`; legacy unassigned rows cannot replace a shop-owned row. Truly unassigned listing IDs are excluded from shop counts and disclosed. |
| First confirmed ERP publication | Listing.rawMetadata.workPublication.publishedAt/listingId/userId + completeEbay.state | Deduplicate by `(platform, shopId, listingId)` and require `completeEbay.state=PUBLISHED`; partial historical coverage. Etsy creation is draft-only; no Amazon/Shopify connector in registry. |
| Shop / connectivity | MarketplaceShop.id,name,marketplace,status,connectionId; MarketplaceConnection.status | Include connected shops and disclose selected disconnected shops. Scope uses persistent shop IDs. |
| Sync health | MarketplaceSyncLog.marketplaceShopId, syncType,status,startedAt,endedAt,recordsFailed; MarketplaceSyncJob status | Sync failure counts are not counts of failed listing publication attempts. |
| Failed publications | Listing.rawMetadata.completeEbay.state/error | Current failed/uncertain state available; historical dated attempt counts unavailable. |
| Images | Inventory.imageUrl; InventoryMedia.type,mediaUrl | Count populated image URL/media references, not video-only media. Remote URL reachability is not probed. |
| Missing certificate details | Inventory.status, imageUrl, media, certificateNo, certificateNumber | Matches Inventory → Missing Certification: status `IN_STOCK`, a non-null image URL or at least one media record, and both certificate identifier fields null/empty string. The report counts eligible SKUs and missing identifiers; it does not claim a certificate document is uploaded. |
| Certificate documents | Inventory.certificates relation to CertificateCode | CertificateCode is reference data, not proof of an uploaded certificate file; document coverage unavailable. |
| Required fields | Inventory itemName,sku,category,description/productDescription,weightValue/carats,sellingPrice,gemType,shape,color | Configurable category policies; existing readiness rules reviewed, but blanket certificate requirement is not adopted. |
| Historical inventory | AnalyticsDailySnapshot / AnalyticsInventorySnapshot | Daily aggregate snapshot exists; per-SKU snapshot is overwritten (inventoryId unique), so no fabricated historical completeness comparison. |
| FX | Marketplace settings currency rates | Current rates are not verified historical transaction rates. Consolidated historical INR unavailable unless explicitly supported; original currency retained. |
| Sender / delivery | ZohoMailConnector.getConnectedAccount(),send(); encrypted email_zoho_oauth_tokens; EmailLog | Reuse existing connector. Provider SENT means acceptance, not confirmed mailbox delivery. |
| Branding | CompanySettings.otherDocsLogoUrl/logoUrl; public/brand/khyatigems-logo.png; public/fonts/*.ttf | Existing approved assets only. No remote scripts/assets in PDF renderer. |
| Scheduler | vercel.json crons; lib/cron-auth.ts | Existing daily triggers cannot honor arbitrary editable minute-level schedules. Add protected persistent dispatcher endpoint; deployment needs a frequent external trigger or supported paid scheduler. No browser timers. |

No new production credentials, OAuth grants or existing business data will be modified. Automatic sending defaults OFF until preview verification and administrator enablement. Live Zoho delivery and production scheduling need authorized deployment checks; mock tests do not prove them.
