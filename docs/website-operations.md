# Website editorial operations

The owner assigns genuine reviewers. Research authors save drafts; qualified reviewers check relevant facts; the owner confirms specimen photographs and permission records. Only then should staff advance factual, media and SEO stages. Dates and qualifications must describe actual completed work.

Daily: review new consented enquiries and record resolution only after handling them. The editor does not send emails. Remove enquiry records only through an authenticated deletion action, following an actual request or the company's approved retention schedule.

Weekly: inspect the public health endpoint `/api/health`, recent errors in Vercel and saved enquiries. In the website checkout, run `node scripts/audit-published-content.mjs` with server-only feed environment settings. `--check-sources` checks known reference domains; other sources require manual checks. Review stale sources, missing related links and orphan candidates. The report never labels pages indexed.

Before each release: obtain a Turso provider backup; keep previous Vercel deployment IDs for ERP and website; validate initialization in a preview. The additive setup saves a logical snapshot inside the website database, but this cannot recover a lost provider database. Article revisions can restore draft content; last published snapshots remain separate. Reverting code does not automatically restore database contents. Test restoration against a separate database before production recovery.

Monthly: inspect real Search Console/Bing coverage, canonical and performance reports; record platform evidence in the search ledger. Review Cloudinary delivery/storage usage and Vercel/Turso service usage directly in their consoles. There is no additional AI-model subscription in the current extractive assistant. The existing providers' actual plan and recurring costs must be confirmed by the account owner; no prices are assumed here.

Quarterly: review source accuracy, image permission changes, assistant errors and corrections. Test keyboard navigation, small-screen layouts and actual media. The 100-case assistant set requires human case-specific evidence and acceptance in addition to automated checks.

Public launch remains held until the owner confirms reviewer and image approvals. The remaining full registry research is editorial work; a code gate does not establish that it is complete.
