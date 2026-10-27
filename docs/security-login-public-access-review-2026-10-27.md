# ERP login, public access and email OTP review

Implementation follow-up: the requested internal invoice/label page protection, removal of SKU-to-customer-invoice links and Zoho email 2FA settings/login flow have now been added to the workspace. See `security-2fa-setup.md` for activation and verification. The findings below are the original pre-change audit; other API findings remain outstanding.

Reviewed: 27 October 2026. Scope: current local source, middleware, page routes, API route authentication candidates, login, public packaging actions and Zoho connector. This is a source review, not a production penetration test. Deployment firewall rules, live responses, installed dependency vulnerabilities, secrets, database contents and every server action have not been verified. Findings apply if this source is deployed without additional access restrictions. No runtime application behavior was changed during this review.

## Decision summary

Fix exposed internal pages and APIs before relying on OTP. The current middleware explicitly passes **all `/api` requests** through. Many handlers enforce their own authentication, but some sensitive handlers do not. A protected screen does not protect its underlying API. Its broad `/invoice` exemption also unintentionally exposes internal `/invoices` pages.

Zoho email OTP is feasible using the existing OAuth connector. Add **Settings → Security & 2FA**, with verified default OTP recipient, separate alert recipients, mandatory verification before creating a session, durable attempt limits, login history and recovery. This document is a proposal; OTP and settings are not implemented or enabled.

## Pages accessible without ERP login

These are the actual page route patterns currently allowed by `middleware.ts`. Replace bracketed values with a real reference; brackets are placeholders, not literal URLs.

| Page | What a visitor can access | Suggested decision |
| --- | --- | --- |
| `/login` | Login form | Keep public |
| `/verify/[serial]` | Packaging verification, gemstone facts, photo, certificate link, recorded retail price | Keep public for QR scans; minimize returned fields and limit scanning |
| `/V/[serial]` | Same verification page, compact QR URL | Keep public for issued labels |
| `/preview/[slug]` | Product data by SKU; serial references redirect to verification; some items offer payment | Owner should confirm all SKUs should be discoverable this way |
| `/preview/label/[serial]` | Printable label preview, SKU, serial, weights, MRP and certificate information | Candidate to require packaging permission if only used by staff |
| `/invoice/[token]` | Customer invoice and payment information for anyone holding the link | Keep only if customer sharing is intended; treat link as a credential |
| `/work-tracker-extension-privacy` | Extension privacy notice | Keep public if extension remains available |

### Critical: internal pages also allowed without login

`pathname.startsWith("/invoice")` matches both `/invoice/...` and `/invoices/...`. The dashboard layout reads the session but does **not** reject a missing session, and these pages have no server authentication checks:

| Internal page | Anonymous exposure in source | Decision |
| --- | --- | --- |
| `/invoices` | Invoice list queried directly from database, including links to internal invoice IDs | Require login + invoice-view permission immediately |
| `/invoices/[id]` | Internal invoice view and resolution/redirect paths, without requiring the customer bearer token | Require login + invoice-view permission immediately |
| `/invoices/[id]/payments/[paymentId]/receipt` | Customer/payment receipt by matching IDs | Require login + payment/invoice permission immediately |

Narrow public matching to the actual `/invoice/[token]` route and add server permission checks before these page queries. A client redirect, hidden sidebar or empty navigation does not protect server-rendered data.

Public supporting resources: `/downloads/work-tracker-extension.zip`, `/manifest.webmanifest`, and matching static assets such as images, fonts, CSS and JS. Most static-file extensions bypass middleware. Files in `public/` should contain only publishable assets; some other extensions still pass through authentication. The manifest and download are explicitly exempted. An existing file is not necessarily publicly served for every extension.

### Pages that look public but are currently login-gated

`/quote/[token]`, `/forgot-password`, `/help`, `/privacy` and `/terms` are **not** in the middleware public allowlist. Their source location/name does not make them public. The quotation page is written as a customer-facing token page but is currently blocked for logged-out customers. Decide whether these should be public before changing the allowlist.

Other ordinary page routes default to requiring login. This is not a complete role/permission audit of every signed-in page.

## Internal APIs that currently lack authentication checks

The following handlers were individually inspected. They have neither a session check nor an integration credential check in their execution path. These should not be available anonymously. IDs and invoice numbers are references, not authorization.

| Priority | Method and route | Current effect / exposure | Required protection |
| --- | --- | --- | --- |
| Critical | `POST /api/admin/fix-invoice` | Updates `Invoice.totalAmount` using supplied invoice number and amount | Remove repair endpoint or restrict to explicitly authorized administrators, validate amount and preserve accounting invariants/audit trail |
| High | `POST /api/upload` | Uploads files to Cloudinary and ImageKit using server credentials | Login + upload permission + enforced file type/count/size limits; freeze guard only checks freeze mode |
| High | `POST /api/ai/inventory-description` | Calls paid AI providers when configured | Login + inventory permission + durable usage limits |
| High | `GET /api/customers/exists?phone=...` | Reveals customer existence, ID and name by phone number | Login + customer access permission |
| High | `GET /api/customers/[id]/advances` | Customer advances and related adjustment/invoice references | Login + financial/customer permission |
| High | `GET /api/customers/[id]/advances-available` | Available balance, advance amounts and notes | Login + financial/customer permission |
| High | `GET /api/customers/[id]/credit-notes-available` | Credit note balances, dates, numbers and tax amounts | Login + financial/customer permission |
| High | `GET /api/dashboard/activity` | Recent staff activity, descriptions, email subjects and invoice identifiers; optional activity statistics | Login + appropriate dashboard/activity permission |
| High | `GET /api/pricing/planner` | Internal margin and charge configuration | Login + pricing permission |
| Medium | `GET /api/cron/inventory` | Triggers inventory metric database updates across unsold stock | Require cron secret; do not rely on an obscure URL |
| Medium | `GET /api/inventory/hsn-map` | Internal category-to-HSN configuration | Login + inventory/packaging permission |
| Medium | `GET /api/inventory/[id]/listings` | Listing IDs, marketplace names and URLs | Login + inventory/listing permission unless intentionally exposed |
| Low | `GET /api/sku/next` | Reveals next global SKU sequence; does not increment it | Login + inventory permission |

Source evidence is in the corresponding `app/api/.../route.ts` files. The root cause allowing anonymous requests to reach them is `middleware.ts`, especially `if (pathname.startsWith("/api")) return response`. `lib/governance.ts` confirms `withFreezeGuard` is not authentication.

## Other APIs reachable without a browser login

Being reachable is different from being authorized. These use another credential, signature or deliberately public contract.

| Route / method | Existing boundary | Review decision |
| --- | --- | --- |
| Auth.js handlers under `/api/auth/[...nextauth]` | Auth.js protocol/credentials | Required for login; enforce OTP inside the server credential/session issuance path |
| `POST /api/auth/forgot-password` | Public request; generic success response | Rate-limit; recovery flow is incomplete: stores token but does not send a reset email |
| `GET /api/auth/refresh` | Requires session | Not public data |
| `GET /api/company/branding` | No credential; only company name/logo | Reasonable for login branding |
| `GET /api/media/upload` | No credential; describes upload API and configured upload size | Low sensitivity; remove diagnostic response if unnecessary |
| `GET /api/skus` | Media sync token | Keep for authorized desktop app; prefer Authorization header over query token |
| `POST /api/media/upload` | Media sync token | Keep integration protection; rotate/revoke independently of user sessions |
| `GET /api/products/search`, `GET /api/products/[id]` | Extension API token helper | Integration access, not anonymous product access |
| `/api/work-tracker/[...path]` | Shared handler uses session or expiring/revocable hashed extension bearer credential | Keep; credential creation requires cookie authentication; inventory all long-lived integration credentials when adding 2FA |
| `GET /api/cron/analytics/daily`, `/api/cron/quotations`, `/api/cron/marketplace/sync`, `/api/cron/reports/export-jobs` | Shared cron secret helper | Production rejects missing secret; helper permits missing secret outside production, so do not expose development servers |
| `GET /api/cron/reports/weekly` | Required cron bearer secret with timing-safe comparison | Keep scheduler credential |
| `POST /api/webhooks/razorpay` | Razorpay signature | Keep public transport with signature verification |
| `POST /api/webhooks/resend` | Resend/Svix signature | Keep public transport with signature verification |
| `GET/POST /api/ebay/account-deletion` | GET challenge; POST signature verification before deletion processing | Required eBay callback |
| `GET /api/email/zoho/callback` | Stored OAuth state + authorization code | State exists but no application-enforced expiry/user binding; harden this |
| `GET /api/integrations/marketplace/oauth/callback` | Stored OAuth state; expiry/consumption checks | Keep callback; review provider-specific flow during hardening |
| `GET/POST /api/website/content` | Feature flag + server bearer feed token (minimum 32 characters) | Keep token server-side in website backend; never embed in browser JS |
| `POST /api/preview/[slug]/payment/order` | Product payment authorization/settings and server-side amount checks | Intended customer checkout; add abuse limits |
| `POST /api/preview/[slug]/payment/verify` | Payment signature + Razorpay lookup | Required checkout verification |
| `POST /api/preview/[slug]/payment/cancel` | Attempt ID matched to SKU; excludes paid attempts | Capability-based access; assess guessing/abuse, add limits |
| `GET /api/public/invoice/[token]/pdf` | Invoice bearer token, via PDF helper | Customer document sharing; consider expiry/revocation and private cache headers |
| `POST /api/public/invoice/[token]/profile-extra` | Invoice bearer token | Updates customer DOB/anniversary and can award loyalty points; owner should explicitly approve this public write feature; ensure atomic reward-once behavior |
| `POST /api/logout` | Can respond without session; authenticated branch signs out | Validate redirect destination/origin; not a business-data API |

Retired website APIs return HTTP 410 without login: `/api/website/catalogue`, `/content-media`, `/inventory`, `/inventory-search`, `/listing-content`, `/listings`, `/manage`, `/media`, `/orders`. They do not currently expose commerce data.

`/api/settings/weekly-reports/[[...path]]` delegates authentication/permission checks to `lib/weekly-report/http.ts`; absence of an inline `auth()` call in a route file alone does not prove a vulnerability. Notification routes likewise use a shared identity check.

The middleware also exempts `/api/serials/verify`, but no matching route handler was found. Remove stale exemptions. Replace broad `startsWith` rules with exact path/segment matching so future routes do not accidentally inherit public access. The `/invoice` prefix collision is an existing exposure, described above; reading a session in the dashboard layout is not an authentication gate.

## Public-link and login concerns beyond API authentication

1. **SKU preview can reveal a customer invoice link.** `app/preview/[slug]/page.tsx` builds `payNowUrl` from a qualifying active unpaid/partial single-item invoice and sends it to the public preview component. Knowing a SKU can therefore disclose its invoice bearer token when those conditions apply. Remove this fallback or require an independently scoped customer checkout capability. A random invoice token does not help if another public page publishes it.
2. **Public server action returns full inventory records.** `verifySerialPublic` and `verifyMultiSerials` in `app/erp/packaging/actions.ts` return the full Inventory model (including internal fields such as cost and vendor reference). The visual verification component only renders selected fields, but exported server action results need their own explicit public projection. Validate emitted action exposure on a build and replace broad queries/return values with allowlisted public fields. Bound multi-serial batch size and rate-limit verification/log writes. Do not assume hiding a field in the UI protects a server response.
3. **Bearer invoice links grant sensitive access.** The invoice page itself looks up by token without an explicit expiry/revocation check. Review active/status/expiry rules consistently across HTML, PDF, profile updates and payment entry points. Add revocation, `Referrer-Policy: no-referrer`, private/no-store caching where appropriate and avoid leaking bearer URLs to third parties. Noindex is not access control.
4. **Password-only session creation.** `lib/auth.ts` compares bcrypt password and immediately returns a user; there is no OTP step. No attempt throttling/temporary lockout is present in this credentials flow. Failed logins are console messages rather than durable security events.
5. **JWT revocation and policy changes.** `lib/auth.config.ts` has no application-defined session version/revocation check. Define explicit session lifetime, revoke-all behavior and policy-version handling so enabling mandatory 2FA also deals with existing sessions. Test deleted users, role changes and password resets against existing cookies.
6. **Recovery and OAuth need hardening.** Forgot-password stores a raw reset token but sends no email; `/forgot-password` is login-gated. Hash reset tokens, expire/use once, rate-limit and complete the flow without bypassing 2FA. Zoho OAuth state is saved as `pending` and only deleted after successful exchange; add expiry, initiating-user binding and atomic single-use consumption.
7. **Existing positives.** Password verification uses bcrypt. Production session cookies are HttpOnly, Secure and SameSite=Lax. Auth.js redirect callback restricts destinations to the configured origin. These help but do not compensate for missing API checks.

## Proposed Settings → Security & 2FA

New page: `/settings/security`, linked from Settings with a shield icon. Use a dedicated security-management permission or tightly restricted administrator access, checked on both reads and writes against the database. Require recent password + OTP verification for sensitive changes.

| Setting | Proposed behavior |
| --- | --- |
| Require two-step verification | Require for all ERP web users; offer staged administrator-only rollout before enforcement |
| Method | Zoho email OTP initially; plan authenticator app/passkeys for stronger protection |
| OTP recipient mode | Configurable verified default mailbox as requested; optional per-user verified mailbox mode |
| Default OTP email | Fixed by administrator, never supplied by the login request; mask it on login; verify ownership before activation |
| Security alert recipients | Separate verified addresses; alerts contain context but no OTP |
| Zoho delivery status | Connection status, last send outcome and test email; do not display tokens |
| OTP policy | Suggested initial limits: 6 digits, 5-minute expiry, 5 guesses/challenge, 60-second resend cooldown, bounded resend count |
| Login limits | Durable limits per account and trusted client IP, progressive temporary lockouts and throttled alerts; tune for shared-office IPs |
| Alerts | OTP requested after correct password, OTP exhausted, lockout, completed login, recovery use, security policy/recipient changes |
| Login history | Account, time in IST, outcome, browser, OS, trusted IP, approximate city/region/country; administrators can filter |
| Sessions | Explicit expiry, revoke all sessions, invalidate sessions that do not meet current 2FA policy |
| Recovery | Single-use hashed recovery codes shown once to authorized owner; documented audited administrator recovery |

Protect the receiving mailbox with its own MFA. A shared default inbox makes its readers approvers for every ERP account; it also adds dependency on whoever has access to that inbox. Prefer individual factors as the team grows. Email OTP is an added verification step but is weaker than phishing-resistant passkeys and depends on mailbox security. See [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

### Server-side flow

1. Rate-limit before password hashing; normalize email and use generic errors. Verify password on the server. Do not create an Auth.js session at this stage.
2. Create a short-lived opaque challenge, bound to user and browser through an HttpOnly, Secure, SameSite cookie. Store challenge state in the shared database with expiry, attempt counters, policy version and consumed state. Do not use process memory for serverless rate limits or challenges.
3. Generate a cryptographically random code. Store a keyed HMAC of the challenge/user/code using a separate server secret (a plain hash of a six-digit code is cheap to brute force offline). Send via `ZohoMailConnector.send`; do not persist OTP content in ordinary email history, queue payloads, application logs or analytics. Confirm delivery submission; never issue a session on send failure.
4. Verify challenge ownership, expiry, policy version and attempt limit server-side. Atomically count failures and atomically consume success so simultaneous requests cannot reuse one code. Resend invalidates earlier codes and does not reset the overall abuse budget.
5. Only after verification, allow `Credentials.authorize` to return the user and issue a fresh full session. Direct calls to Auth.js credentials callback must enforce the same gate; a client-only OTP screen can be bypassed. Do not accept client-supplied `mfaVerified` flags or expose a reusable session-grant token.
6. Write a durable security event and send a separate completed-login alert. Keep failed-attempt alerts throttled and never include a code in general alerts. A failed password should not trigger an OTP email, to prevent mailbox flooding.
7. At activation, verify the destination mailbox and test Zoho first. Invalidate older sessions or require step-up on their next use. Use verified recovery when Zoho is unavailable; never silently fall back to password-only access.

Keep machine tokens, signed webhooks and scheduler secrets as explicitly separate authentication mechanisms. 2FA on browser login does not revoke or protect existing integration tokens automatically.

### OTP email example

```text
Subject: KhyatiGems ERP sign-in verification

Account: [ERP user's email]
Code: [six-digit code] — expires in 5 minutes
Time: [date and time, IST]
Browser: [browser and reported version]
OS: [reported operating system]
IP: [trusted client IP]
Approximate location: [city, region, country or Unavailable]
Reference: [non-secret event reference]

A correct password was entered. Sign-in is waiting for this code.
If this was not you, do not share the code; review your account security.
```

Browser/OS come from server-parsed User-Agent and can be spoofed. IP must come from the trusted hosting/proxy boundary, not arbitrary client fields or an unvalidated forwarded chain. If deployed on Vercel, its documented request IP/geolocation headers can supply context; verify the actual proxy arrangement first. Location is approximate and can reflect a VPN/mobile network. Missing geolocation must not prevent OTP verification. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

Existing `lib/email/connectors/zoho.ts` already refreshes OAuth tokens and sends messages. Reuse that connector directly in a dedicated security mail service; avoid the ordinary business-message history. Zoho supports sending through its [Mail Messages API](https://www.zoho.com/mail/help/api/email-api.html). Live delivery and current OAuth configuration still require verification before rollout.

## Implementation order and acceptance criteria

1. Protect the three internal invoice page patterns and close the individually listed internal APIs; add login and action-specific permission checks before database queries, uploads or provider calls. Add a default-deny API boundary with a reviewed exact list for public/capability/integration routes; retain handler-level checks.
2. Remove public SKU-to-invoice token disclosure; minimize public server action output; review customer profile writes and document token lifecycle. Let the owner decide whether label previews and SKU previews remain public.
3. Build security settings, challenge persistence, durable limits, security-only Zoho mail and the server-enforced OTP login flow together. Complete recovery and session revocation.
4. Verify anonymous requests to internal APIs return 401, authenticated insufficient-role requests return 403, and neither causes side effects. Verify intended public customer pages, cron, desktop integration, extension and signed webhooks continue functioning.
5. Test direct credentials callback bypass attempts, missing/wrong/expired/replayed OTPs, cross-browser challenge use, parallel verification, resend invalidation, lockouts across multiple workers, email failures, policy changes, recovery code reuse and existing-session invalidation. Confirm logs, email histories and error responses never expose codes or secrets. Test public output for absence of cost/vendor data and invoice capabilities.
6. Verify production configuration and dependencies, then perform a separate controlled runtime security review. This source review cannot establish that nobody can hack the ERP.
