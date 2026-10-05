# Communication Center email queue

Outbound emails continue to use the existing email service and configured provider. New messages persist their rendered content, CC/BCC recipients, and attachment content so a retry sends the same message. Email detail and attachment endpoints require `communication:view`; compose and recovery actions require `communication:manage`.

New messages send immediately unless saved as a draft or scheduled. Due scheduled messages and retries are processed manually from **Communication Center → Process Due Emails**, so no cron service or external scheduler is required. Per-message **Send Now**, **Retry**, and **Cancel** controls are also available when the current status allows them.

Transient failures are re-queued using these delays:

| Failed attempt | Next attempt |
| --- | --- |
| 1 | 5 minutes |
| 2 | 30 minutes |
| 3 | 2 hours |
| 4 | 6 hours |
| 5 | Marked failed |

Only recognized network errors, timeouts, rate limits, and temporary provider errors are eligible for retry. Invalid message data, provider authentication failures, permanent provider rejections, and unclassified errors are not retried. A scheduled retry will not run unattended; an operator must process due emails in the center.

## Manual worker

The authenticated `POST /api/email/communications/process-due` endpoint is called by the center's manual action and processes at most 25 due messages. Messages are claimed atomically before provider calls.

The queue columns are added to existing databases by the application's idempotent marketplace-foundation schema initializer. Regenerate Prisma Client after changing `prisma/schema.prisma`.

## Delivery events

Delivery lifecycle statuses are updated only for Resend messages through its signed webhook events. Configure a Resend webhook to `https://<your-domain>/api/webhooks/resend` for `email.delivered`, `email.opened`, and `email.bounced`, then set its signing secret as `RESEND_WEBHOOK_SECRET` in the deployment environment. The endpoint validates the Svix signature and timestamp, rejects unknown message IDs for provider retry, deduplicates event IDs, and records event IDs and provider timestamps. Delivery/open/bounce status is not inferred for Zoho.

Inbound Zoho messages use `RECEIVED`; that status is distinct from outbound provider-confirmed `DELIVERED`. Existing inbound records previously marked `DELIVERED` are normalized to `RECEIVED` by the schema initializer.
Inbox sync retrieves message content when the Zoho list response omits it, stores HTML/plain-text separately, and records the provider's received timestamp. Center ordering and displayed creation time use the received timestamp for inbound mail; the sync run time remains separate in the health summary. Existing inbound entries are enriched on the next manual sync when Zoho supplies a body or received time that was previously missing.
Manual inbox sync resolves Zoho's Inbox folder and passes its folder ID to both the message-list and message-content API. The Zoho OAuth scope includes `ZohoMail.folders.READ`; reconnect Zoho Mail after this scope change so the saved grant includes folder access. The result distinguishes newly imported messages, enriched existing messages, already-synced messages, failures, and how many messages Zoho returned.

Outgoing HTML emails use a shared, mobile-friendly KhyatiGems layout with the Cloudinary header and signature banners, customer message content, and a “Kind regards, KhyatiGems” close. Social links include static PNG icons with visible linked text labels so email clients that strip inline SVG can still render the icons; text links remain available if remote images are blocked. Configure `PUBLIC_BASE_URL` or `APP_BASE_URL` to the ERP's public HTTPS origin (or ensure `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` is already set) so clients can load icons from `/email/social-icons/`. Plain-text alternatives retain the message and add the same closing and URLs. Embedded banners are part of the message body and do not control the sender avatar shown in recipient inbox lists.

Zoho sends use the RFC-style sender value `"KhyatiGems" <address>` so recipients receive an explicit sender display name as well as the configured mailbox. Set `ZOHO_MAIL_FROM` to the Zoho-authorized mailbox and optionally set `ZOHO_MAIL_FROM_NAME` to change the label (default: `KhyatiGems`); restart/redeploy the app after changing environment variables. This changes the sender name, not the inbox avatar/logo. If a recipient still sees an old label, inspect the received message's original headers and check whether their mail client has a saved contact for the sender.

## Attachments and linked timelines

Communication details offer authenticated download and safe inline preview for PDF and common raster images. Other file types remain download-only. Generated invoice and certificate attachments retain explicit invoice/inventory source IDs, not filename-based associations. Customer and invoice timelines use the Communication Center query service and link to the communication detail and related records.

## Unified channels, follow-ups, and audit

The Center and customer/invoice timelines expose a unified projection over the existing `EmailLog`, `CustomerCampaignLog`, and `FollowUp` sources. This intentionally avoids a destructive migration or duplicated canonical rows. Follow-up records have OPEN, COMPLETED, CANCELLED, and RESCHEDULED lifecycle states and remain linked to their source invoice. Actions require receivables-management permission and are recorded in the existing ActivityLog.

WhatsApp Web records mean that an operator opened a prefilled manual handoff. They are not evidence that WhatsApp sent, delivered, or read the message. Older `OPENED_IN_WHATSAPP` campaign statuses are normalized to `LAUNCHED`; the launch endpoint is POST-only.
Customer profiles can launch birthday/anniversary WhatsApp wishes when the corresponding date is present. Invoice detail can download the invoice PDF and open a prepared WhatsApp Web message; the operator must attach that downloaded PDF and send it manually. Both handoffs are recorded with their prepared message and linked customer/invoice for the communication timeline.

Selecting an invoice in Compose Email automatically generates and attaches the canonical invoice PDF. A PDF generation/size error stops the send rather than silently sending without the selected document. Reply and Reply All include the source email as quoted text; delivery/open timestamps appear only when reported by a provider that supports those events (currently Resend).

Compose requests require an `Idempotency-Key`; the key is scoped to the signed-in operator and unique on the stored email record, preventing duplicate records/sends on request retries. Operator compose, email recovery, queue processing, inbox sync, follow-up changes, and WhatsApp launches are recorded in ActivityLog and shown on email details when applicable.
Invoice, certificate, and combined email templates greet the customer, include the purchase date, and mention the attached document(s). Marketplace order references are resolved from the linked marketplace order item when available and omitted otherwise. Invoice PDFs generated inside Compose are allowed up to 20 MB; manually uploaded files remain limited to 2 MB each and 3 MB total, with a 20 MB cap across the final message.

Certificate email actions retrieve the A4 PDF from the GCI integration API using the inventory certificate number. The configured `GCI_INTEGRATION_BASE_URL` must point to the GCI application that exposes `GET /api/integration/certificates/{certificateNumber}` and `GET /api/integration/certificates/{certificateNumber}/pdf?format=A4`; the GCI API key must also be configured. A JSON 404 stating that the route could not be found means the GCI route is not deployed at that base URL. A certificate-specific 404 means the route exists but GCI cannot find that certificate number.

Communication Analytics reports a rolling 30-day email window. Provider state is explicitly “configured” rather than a live connection test; email sending and inbox sync remain manual. Queue size and overdue follow-ups are included in the operational health indicator.
