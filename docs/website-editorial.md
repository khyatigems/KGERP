> **17 October 2026:** See [Website studio](website-studio.md) for the redesigned editor, announcement previews and enquiry filters/recovery. The 46-page launch candidate has documented owner-delegated AI source review, with human reviewer fields blank and the method disclosed; the old blanket human-approval references below are historical. Production rollout is still separate. The owner confirmed receipt of the first controlled Zoho acknowledgement, and the revised readable enquiry number matches its saved record/email log. No real mail was sent during the 17 October audit.

# Website editorial management

Website Management now manages the KhyatiGems encyclopedia through its separate website Turso database. The active implementation is `components/website/editorial-manager.tsx`, `lib/website/editorial` and `app/api/website/editorial`.

Reuse existing WEBSITE_DATABASE_URL, WEBSITE_DATABASE_AUTH_TOKEN, WEBSITE_FEED_TOKEN and CLOUDINARY settings. The authenticated initialization button performs additive setup and imports research entries and five unreviewed drafts without publishing. It rejects an unexpected remote database destination and does not modify ERP inventory or accounting tables.

Articles progress through draft, factual review, image approval, SEO validation and publication. Supply only verified reviewer details. Existing publications remain stable while drafts change. Media uploads are pending and require actual licensing, specimen and rights confirmation. Cloudinary presence is not approval.

The bearer-protected `/api/website/content` feed exposes approved published snapshots only. Its POST actions persist enquiries submitted with consent, aggregate anonymous public website usage counts by day/action/path, and hashed rate-limit counters. Usage totals do not include search text, messages, or visitor identifiers. No email delivery is claimed. Search observations require manually supplied evidence and are not automatic indexing assertions.

Previous website commerce routes now return 410. Existing commerce database records are retained for history; do not run the retired commerce importers. Website choices were removed from commerce listing creation without changing other marketplace or accounting workflows.

Before production initialization, obtain a provider database backup. Setup's logical snapshot in the same database supports application recovery but not disaster recovery. No production migration, media upload or deployment has been executed by the local implementation tests.

Validation: `npx tsc --noEmit`, `npx tsx scripts/tests/website-editorial.integration.ts`, `node scripts/tests/website-editorial.browser.cjs`. Tests use isolated fixture databases; browser authentication and Cloudinary are mocked. Regenerate embedded SQL with `node scripts/website/sync-schema.mjs` after changing `editorial.sql`.

The website checkout's `NEXTJS_ERP_IMPLEMENTATION.md` documents deployment order and pending human publication approvals.


Website enquiry acknowledgement: the content POST saves the consented enquiry first and then uses the ERP email template `email_website_enquiry_acknowledgement`. The template is seeded idempotently by the existing email-template service and can be edited/disabled in Settings > Email Templates. Names and subjects are escaped by the existing template renderer; messages are not echoed into the acknowledgement. A per-enquiry idempotency key prevents duplicate acknowledgements. `WebsiteEnquiryEmail` is an additive table created by the enquiry-email helper; migration 001 bytes/checksum remain unchanged. Website Management shows last acknowledgement result and links to Communication for actual mail status/retry. Sent/queued results are not resent through the website action. A failed provider attempt never removes the saved enquiry.

For current localhost development only: run `npx tsx scripts/website/local-content-server.ts` from this ERP checkout, then `npm run dev -- --webpack` from the website checkout. The server binds 127.0.0.1:3011, requires the same private WEBSITE_FEED_TOKEN and refuses remote website databases. It snapshots local website records before additive initialization, imports ten draft records idempotently and never bypasses ERP user authentication. Real form submissions use the configured ERP email provider; do not use actual recipients in automated tests. Production must use the HTTPS ERP content endpoint after deployment.
