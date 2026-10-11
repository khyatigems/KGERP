# Reports, users, roles, and inventory redesign audit

Reviewed on 11 October 2026. All verification used isolated local SQLite fixtures; production data and role assignments were not changed.

## Reports

- Preserved all 33 existing report pages, exports, and report functions. No report was deleted.
- The default Reports page now presents a searchable, categorized library. Report data loads when a report is opened; the previous analytics overview remains available at `/reports?view=overview`.
- Consolidated duplicate navigation into a single catalog and added discoverability for the existing advance, receivable, and export payment reports.
- The Expenses navigation entry had no corresponding page. It remains visible as unavailable; no expense records or workflows were removed.
- Removed the three unused Category, Vendor, and Platform input controls from the overview. They had no handlers or query bindings. Individual reports retain their own filters.
- Fixed pending invoice counts: the SQL query returns one row containing both counts, but pending counts were previously read from an undefined second row.
- Report pages and report APIs now use assigned database permissions instead of static legacy role names. Financial reports require financial access; vendor reports require supplier report access in addition to general report access.
- All 33 pages returned HTTP 200 during the browser audit, with no page errors or report API failures. This validates rendering with fixture data; it is not a guarantee of every production dataset or export format.

| Report | Group | Local browser check |
| --- | --- | --- |
| Inventory | Inventory | Passed |
| Inventory Aging | Inventory | Passed |
| Category Stock | Inventory | Passed |
| Certificate Readiness | Inventory | Passed |
| Missing Media | Inventory | Passed |
| Capital Rotation | Inventory | Passed |
| Sales | Sales & quotations | Passed |
| Turnover Report | Sales & quotations | Passed |
| Top Categories | Sales & quotations | Passed |
| Sales Cycle | Sales & quotations | Passed |
| Quotations | Sales & quotations | Passed |
| Profit | Finance & payments | Passed |
| Invoices | Finance & payments | Passed |
| Payments | Finance & payments | Passed |
| Gst | Finance & payments | Passed |
| Receivables | Finance & payments | Passed |
| Export Payments | Finance & payments | Passed |
| Customer Advances | Finance & payments | Passed |
| Pending Advances | Finance & payments | Passed |
| Advance Utilization | Finance & payments | Passed |
| Vendor Purchases | Suppliers | Passed |
| Vendor Inventory | Suppliers | Passed |
| Vendor Dependency | Suppliers | Passed |
| Customer Intelligence | Customers & loyalty | Passed |
| Top Customers | Customers & loyalty | Passed |
| Purchase Timeline | Customers & loyalty | Passed |
| Loyalty Points | Customers & loyalty | Passed |
| Discount Usage | Customers & loyalty | Passed |
| Ops | Operations | Passed |
| Label Printing | Operations | Passed |
| Qr Scans | Operations | Passed |
| User Activity | Operations | Passed |
| System Logs | Operations | Passed |

## Users and permissions

- Users display as individual cards with avatars, email, role, last sign-in, creation date, and existing edit/delete actions. Last sign-in is not presented as live online presence.
- All 40 current application permission keys are available in searchable module cards. Existing database permission records are also retained. Grouped Manage controls were kept at the user’s request, with descriptions of their scope.
- New and duplicate roles use an application dialog. New roles are selected after creation; permission saving keeps the current role selected.
- Custom active roles can be assigned when creating or editing users; the previous fixed enum rejected them.
- Default grants are seeded only for newly created system roles. Opening the role catalog no longer restores removed grants for existing roles.
- Assigned database role grants are authoritative. Removing the last permission no longer falls back to legacy ADMIN/ACCOUNTS grants. Individual allow/deny overrides continue to apply.
- Superadmin access logic and existing superadmin grant records are preserved. Editing its permissions, reassigning its role, duplicating its protected role, and deleting its account are blocked. Browser verification confirmed an attempted permission update returned 403 and its saved permission records stayed unchanged.
- Browser checks passed for role creation, selecting the new role, saving permissions across repeated catalog loads, and creating a user with a custom role.

## Inventory

- Restyled summary cards with icons, rounded corners, clearer values, and image/certificate completeness bars.
- Restyled the action toolbar and filter controls, preserving the existing actions and handlers.
- The inventory table component, column definitions, row controls, and data queries were not edited.

## Verification

- `npx tsc --noEmit`: passed.
- Targeted ESLint: no errors; the existing avatar image pattern has an image optimization warning.
- Report route/catalog coverage and vendor report snapshot checks: passed.
- Reporting fixture integration: inventory summary, aging, and capital rotation fallback checks passed.
- Role integration: grants, final-permission revocation, user overrides, and existing superadmin access passed.
- Browser audit: 33 report pages passed; user cards, report search, role modal, custom user assignment, and inventory overview passed.

## Remaining performance considerations

The library avoids executing the overview’s aggregates and diagnostics on every Reports visit. Actual production latency has not been measured. Some individual report implementations still read large datasets, and the Payment report retains its existing automatic historical reconciliation behavior; those functions were preserved to avoid changing accounting workflows during the redesign.

## Follow-up: report icons, legacy listing button, and permission coverage

- Every report now uses a distinct Lucide SVG icon with a stable category color, including contrasting colors for dark themes. Hover movement respects reduced-motion preferences. The 33 report routes remain intact.
- Removed the unavailable Expenses navigation placeholder and hidden expense permission rows from the permission picker. No expense records, permission records, or saved role grants were deleted. Hidden grants remain in the role selection payload when other permissions are saved.
- Hid the old Inventory Bulk Listings toolbar action. Its component and underlying implementation remain available; the inventory table is unchanged.
- Added grouped controls for Labels, personal Activity Log, Merge Customers, Customer Advances, and Customer Insight Reports. They are connected to page/server checks, and navigation recognizes the new grants. Existing umbrella access remains supported to preserve workflows. Activity access still restricts ordinary users to their own events.
- Custom roles can now access customer insight reports when given Reports View plus Customer Insights; the three reports previously required a fixed ADMIN/SUPER_ADMIN role. Existing admin access is retained.
- Replaced fixed role-name permission checks in affected dashboard pages/actions and customer/return APIs with saved database permission checks, including settings subpages and sales-return creation.
- Expanded descriptions for grouped workflows: marketplace control center/drafts/orders/conflicts/reconciliation; inventory import/copy/bulk editing/matched pairs; purchase creation through Inventory Create; sales returns through Sales; credit notes through Receivables; settings subpages through Settings Manage.
- Permission metadata is created lazily by the existing role catalog initialization. Existing system-role grants, including superadmin grants, are not rewritten.

## Dashboard recommendation (proposal only)

The current four-column widget container squeezes composite widgets into single columns. Persistent widget titles/settings and nested cards repeat headings and borders. The header, inventory health, connection diagnostics, notes, and matched pairs compete with core sales and collection information.

Recommend a Business Overview: four peer metrics (period sales, actual invoice balance, available stock, ready-to-list stock); a broad sales chart alongside three priority actions; compact inventory readiness and channel status; notes, matched pairs, and activity in an expandable workspace. Alternative Operations Focus uses three action lanes for collection, stock preparation, and channels. Preview values are explicitly sample data.

Implementation should retain saved dashboard layouts through migration, show controls only in customization mode, load optional sections on demand, and use brief state transitions with reduced-motion support. Before using current dashboard trends, correct the pending-payments comparison: it currently uses the label count trend. Attention arrays are capped at five, so counts should come from aggregates rather than array lengths. The dashboard summary endpoint also needs an explicit unauthenticated rejection and permission-aware data selection before broader delegation of dashboard access.

The dashboard has not been replaced in this follow-up; the interactive alternatives are for reviewing its redesign. TypeScript, report route coverage, and isolated permission tests passed. The preview was checked at desktop/mobile widths with working period selection. A fresh application browser test was prevented by an already-running development server holding the Next.js lock; that server was left running.

## Revised dashboard direction: gemstone trading

The user rejected the generic Business Overview and Operations Focus proposals. The replacement proposal centers the ERP's actual purpose: maintain gemstone inventory, sell on eBay/Etsy, manage channel listings, retain customers, issue tax/export invoices, and inspect superadmin/user activity. This section supersedes the earlier dashboard recommendation.

- Compact top summary: available unique stock SKUs, stock ready but without an active channel listing, active marketplace listings, and current-period invoices split into export/tax.
- Primary area: gemstone inventory distribution and channel coverage beside separate eBay/Etsy listing summaries, drafts, last sync, and exceptions. Support individual connected shops. Listing totals are never presented as stock totals: one SKU can have several channel listings.
- Secondary area: recent tax/export invoices with customer, country, original currency, and payment state; a persistent activity log with actor, role, action, entity/SKU/document, time, and recorded before/after values where available. Include actor filtering and change detail.
- Preserve role-aware visibility. The mock depicts superadmin team visibility; ordinary user access must follow existing log restrictions. Sensitive cost information requires Inventory View Cost. No role/grant changes are part of the proposal.
- Calculate available inventory from IN_STOCK rows. Calculate coverage from distinct linked inventory IDs with active connected-channel listings, excluding unmatched listing rows. Channel totals and stock coverage are separate aggregates.
- Derive listing readiness from actual channel preparation requirements rather than requiring certificates for every gemstone. Ready/unlisted counts need distinct eligible inventory IDs without active listings; cannot subtract overlapping image/certificate deficiency counts.
- Use Invoice.invoiceType, invoiceDate, invoiceCurrency, totalAmount, paidAmount, and existing export fields for document summaries. Do not add USD and INR totals together or substitute inventory sales rows for invoice counts.
- ActivityLog provides actor/name, entityIdentifier/referenceId, action, fieldChanges/details, source, and createdAt. Display recorded data only; do not infer unrecorded changes or treat sync timestamps as live channel availability.

The current dashboard API already supplies inventory counts, linked marketplace listings, connected shops, and recent sales. Distinct SKU coverage, eligible unlisted stock, invoice-type/customer summaries, and detailed activity need permission-aware aggregates and integration with existing activity endpoints. Optional diagnostics, label cart, database status, notes, and duplicate KPI widgets move off the primary dashboard. Existing routes and workflows remain accessible.

The new interactive proposal uses explicitly labeled sample data and was checked at 1100, 736, 360, and 320 pixel widths. Marketplace-shop, invoice-type, and activity-user filters and the price-change detail work. No ERP dashboard components or data endpoints were changed for this proposal.


## Implemented gemstone dashboard and Appearance

The home page now offers Gemstone trading and Current dashboard in the existing Appearance control. Current dashboard dynamically loads the existing, unmodified DashboardView and preserves its persisted widget layout. View and motion preferences are device-local; palette persists through the existing account theme API. A cookie selects the matching initial server view on reload. The sidebar menu file is unchanged from the start of this implementation.

The trading view uses permission-scoped inventory summaries, distinct listed in-stock SKUs, separate eBay/Etsy channel totals, preparation indicators, shop sync errors, tax/export invoices in their recorded currency, customer counts, and bounded activity records. India calendar boundaries drive monthly counts. Missing sections display unavailable rather than fabricated zeroes. Only safe recorded activity changes are displayed; access is checked before cached data is used. No report or current dashboard widget was removed.

Appearance now provides clean opaque Sapphire, Emerald, and Amethyst surfaces in light/dark/system modes, SVG graphics, short transitions, and a reduced-motion option. The new view avoids chart, drag-and-drop, and Lottie dependencies; those existing dashboard widgets load on selection. One dashboard data request replaces independent widget polling for the trading view. Data refreshes every two minutes while visible; server summaries cache for 30 seconds. Concurrent cold cache reads now share one load, errors are retriable, and invalidated in-flight reads cannot restore stale values. Manual refresh updates the cache.

Validation: TypeScript check; dashboard cache concurrency/invalidation/failure/preference tests; isolated full-schema SQLite integration checking cross-listed unique SKU counts against channel listing counts, prepared filters, draft/error totals, restricted access, grant revocation against cached data, and safe activity fields. Initial small-fixture dashboard data load measured 152 ms locally; this is not a production latency benchmark. Browser review on an isolated fixture instance confirmed both views load, Current dashboard persists after reload, switching back works, and Appearance exposes the palettes and motion option. Production network latency remains to be assessed. Run `npm run test:dashboard` to reproduce functional checks without using the configured ERP database.


## Invoice correction, marketplace brands, sidebar follow-up

Dashboard invoice grouping now recognizes stored EXPORT_INVOICE / TAX_INVOICE values and legacy EXPORT / TAX aliases, and normalizes recent invoice types for working filters. Monthly issued counts exclude drafts/cancellations and use invoiceDate with a createdAt fallback only when undated. The recent list explicitly spans all dates. Regression fixtures cover current export/tax, draft, and old dated invoices.

Brand SVGs are local assets: Etsy wordmark from https://www.etsy.com/press (https://extfiles.etsy.com/Press/brand-assets/etsy-logos.zip); eBay wordmark from https://commons.wikimedia.org/wiki/File:EBay_logo.svg. Dashboard uses both; the existing inventory description control now shows Etsy alongside the eBay control. No inventory table layout change. Website channel integration remains future scope and no placeholder website counts or connections are introduced.

Sidebar navGroups definition verified byte-equivalent to pre-redesign contents. Menus, ordering, routes, permission fallbacks, badges, collapse/group persistence, mobile navigation, and loading behavior remain. Style uses palette-consistent active bars, stable padding, static SVGs instead of Lottie hover animations, and fixed Appearance footer accessible in expanded/collapsed/mobile views.


## Deployment readiness checked 11 October 2026

Final optimized Next.js production build exited 0: JavaScript compilation, production TypeScript validation, and all 155 prerendered pages completed. The build used a separate dist directory and an isolated fixture database. Activity API and loyalty report now explicitly use dynamic rendering, eliminating their previous build-time data access diagnostics. Standalone TypeScript, report route/snapshot/fixture tests, role unit and assigned-role/revocation/override/superadmin regression tests, and dashboard cache/data regression tests exited 0. Fresh Prisma generation to an isolated output directory succeeded. The standard local build script initially could not replace the Windows engine DLL held by the running ERP; production compilation was verified with the already-generated client without stopping the user's ERP.

Repository lint remains pre-existing debt: 268 errors and 226 warnings across 181 files, 165 of which were untouched. All 46 errors in edited files point to unchanged source lines found in HEAD; no newly added files have lint findings. This is a build-ready result, not a claim that the entire ERP is error-free. No deployment or production database mutation was performed by these readiness checks. Temporary review outputs are excluded from Git and lint scanning.
