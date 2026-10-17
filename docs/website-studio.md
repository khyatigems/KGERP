# Website publishing studio

Updated 17 October 2026. Authenticated `/website-management` requires the existing settings-management permission and the website feature flag. The dedicated website database remains separate from ERP business data.

## Workspace

- Coverage: publication counts, quick actions, title/alias search and content type/stage filters.
- Articles: existing drafts, sources, editorial gates, revisions and private previews. Reviewed launch import now safely retries an interrupted matching record; existing publications and changed staff drafts stay preserved.
- Media & rights: existing ERP Cloudinary image/video upload, thumbnails, metadata and documented rights. Uploading is not approval.
- Site information: grouped homepage copy/actions, company/contact fields, ownership codes, approved placements, section ordering and private full-page preview.
- Announcements: new notice templates, draft/active switches, CTA text/internal path, three colour themes, schedule, order, duplication and removal. Device-width preview uses the same component as the website. Visitor view evaluates enabled and time-window rules at the selected local time; the selected-draft view explicitly includes disabled drafts. Saving persists the whole website settings revision, including unsaved changes from Site information.
- Search readiness and Usage counts: retain the existing evidence ledger and aggregate usage tools, without implying search indexing from sitemap inclusion.
- Enquiries: search all records by customer number/name/email/subject/owner, page in batches of 50, filter status or due follow-ups, assign staff, add private notes, record dates and resolve/reopen. Acknowledgements use the existing ERP provider/template. A sending claim older than 15 minutes can recover using the same idempotency key. Provider failures with an existing log must be reviewed/retried through ERP Communication controls.

Settings changes survive tab switches. Saving uses the revision loaded when editing began: refreshing other data does not silently bypass a concurrent editor's conflict. Unsaved changes have an explicit discard action and browser-exit protection. Announcements reject invalid date order, unsafe external paths and more than ten entries. The website feed includes only enabled notices in their active time window. Private previews clear both human and AI review metadata.

## Shared code

In the website repository run `node scripts/sync-erp-contract.mjs "D:/Tools by Akansh/khyatigems-erp"`. It copies the contract, shared announcement renderer/CSS and existing homepage/article preview components/assets. Deployment must coordinate both applications when this contract changes.

## Local validation

Use `npx tsc --noEmit`, `npx tsx scripts/tests/website-editorial.integration.ts` and `node scripts/tests/website-editorial.browser.cjs`. Integration/browser tests use fresh local website databases; browser authentication, email and Cloudinary are explicit test fixtures. They never prove real live account authentication or provider delivery. Screenshots are in ignored `tmp/website-development/editorial-browser/`.

Do not start a complete ERP build/dev server against production business credentials merely to preview this interface: legacy schema initialization can affect that connection. Use the isolated harness for UI work. Production requires compatible deployments, provider backup, website-only setup, live enquiry/upload checks and rollback evidence.
