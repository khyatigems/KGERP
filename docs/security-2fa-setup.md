# Security & 2FA setup

This update adds `/settings/security`, linked under Settings → Module Configuration and searchable as “2FA”, “OTP” or “Security”. Access requires the current database `settings:manage` permission.

## Activate

1. Deploy the update. Set a stable strong `AUTH_SECRET` (or existing `NEXTAUTH_SECRET`) and keep it consistent across workers. Changing it revokes sessions and makes existing challenge/recovery hashes unusable.
2. Confirm the existing Zoho OAuth connection under Settings → Email Templates. The connected mailbox must be able to send email. Security emails use the existing Zoho connector directly and do not enter ERP communication history or the business email queue.
3. Open Settings → Security & 2FA. Enter the default OTP recipient, enable “Require 2FA for all ERP web users”, choose login alerts and enter your own ERP password.
4. Send the verification email, enter its six-digit code, then select “Verify and save security settings”. Sending a code alone does not enable 2FA.
5. The **Recovery codes** panel at the top of the page automatically opens with eight codes. Choose **Download codes (.txt)** or **Copy all codes**. The file includes your account and recovery instructions. Codes work only for the administrator account that saved the settings, with its correct password. Each code works once. Saving global settings replaces previous recovery codes.
6. Sign in again. Older sessions fail server-side validation after mandatory verification is enabled or its policy changes. The login page remains accessible so revoked cookies do not create a redirect loop.

2FA starts disabled until a verified configuration is saved. This update does not choose or enable a production recipient automatically.

## Save or replace recovery codes later

The Recovery codes panel is always visible under Security & 2FA. It shows the count of unused codes for your current account. Existing code values are not recoverable from their stored HMACs and cannot be displayed again after leaving the page.

If you missed saving your codes, select **Generate replacement codes** (or **Generate recovery codes** if none remain). Enter your ERP password, request a code to the configured OTP mailbox and verify it. Download or copy the new codes immediately. Only your account's previous codes are invalidated; other users' codes, the global 2FA configuration and active sessions remain unchanged. Generation requires active 2FA, settings permission, password confirmation and a single-use browser-bound email challenge. A security notice is sent without including the recovery codes.

Download and copy work locally in the browser. Codes are not written to browser storage or included in URLs. If clipboard access is unavailable, download the text file or select the displayed codes manually.

## Login and alerts

Passwords are checked before sending an OTP. Codes expire after five minutes, allow five guesses and are bound to the account, challenge purpose, policy version and an HttpOnly browser cookie. Resending after the 60-second cooldown invalidates older codes. Database counters enforce shared request limits across workers. Direct Auth.js credential requests also require verification.

OTP messages include the account, timestamp in IST, browser/version and OS reported by the browser, trusted IP and approximate location. Vercel deployments use provider IP/geolocation headers; other hosts show “Unavailable” until a trusted proxy integration is added. Arbitrary client `X-Forwarded-For` values are ignored. Geolocation can reflect a VPN and browser information can be spoofed.

All OTP purposes (login, security setup, current-mailbox confirmation and recovery-code replacement) use the branded navy-and-gold HTML template in `lib/security/otp-email.ts`. It uses email-compatible tables and inline styles, a large contiguous selectable six-digit code, expiry information and request details. It needs no images, scripts or remote tracking resources. Zoho sends the HTML version using its existing `mailFormat: html` support; the renderer also supplies a text representation for other callers.

Gmail's native **Copy code** control is controlled by Gmail. The template uses explicit verification-code wording and uninterrupted digits to make the code easy to identify and copy. There is no documented sender-controlled OTP-copy action in [Google's email-action API](https://developers.google.com/workspace/gmail/markup/actions/actions-overview), so this implementation does not promise that Gmail will show its native button for every message/account/device. No JavaScript-based clipboard button is placed inside the email. A real Gmail delivery test is still needed to observe the native control; browser preview tests only verify the email layout and selectable code. Layout follows [Gmail's supported CSS guidance](https://developers.google.com/workspace/gmail/design/css).

When alerts are enabled, the same configured mailbox receives completed-login notices and throttled notices after repeated OTP failures. Recovery use and security policy changes always produce notification attempts. Alert delivery failures do not bypass verification. Relevant events are recorded in the existing activity log without codes/passwords. Activity-log visibility follows its existing permission controls.

Changing an active recipient requires successful codes from both the proposed mailbox and the current mailbox. Disabling verification also requires password and email confirmation. If Zoho delivery fails, policy changes are not applied. Login recovery codes allow the owning administrator to sign in during a mail outage; they do not override the mailbox confirmation required for changing settings.

Keep the receiving mailbox protected with its own MFA. With a shared default mailbox, all readers can approve sign-ins for all ERP users.

## Data and operational scope

Policy is stored as `Setting.security_2fa_v1`. Idempotent server initialization creates `SecurityChallenge`, `SecurityRate` and `SecurityRecovery` tables; it does not change existing business tables. Back up these tables with the database. Codes are stored as keyed HMACs; browser binding tokens and rate-limit keys are hashed. Only expired challenge/counter rows older than a day are pruned. Existing integrations continue to use their own tokens/signatures.

The label-preview and internal invoice page routes now require login and permissions. Public SKU previews no longer query or link customer invoices. Explicitly authorized inventory QR payment checkout continues to work.

The separate source review in `security-login-public-access-review-2026-10-27.md` records other internal API authorization findings. Those remain a separate hardening task; browser 2FA does not protect a handler that never checks authentication.

## Verification

Run `npm run test:security` for OTP template checks, isolated SQLite/Auth.js integration tests and interactive browser checks using synthetic API responses. No production account/database or real mail is used. Tests cover direct login bypass, challenge binding/expiry/guess limits/replay/concurrency, resend invalidation, delivery failure, settings/recovery authorization, both-mailbox confirmation, recovery replacement isolation, real file downloads, clipboard formatting, email HTML escaping and session-policy revocation. Browser tests stub clipboard writes to preserve the user's clipboard. Desktop/mobile Settings and OTP email screenshots are generated under `output/security/`.

Verify actual Zoho delivery using the Settings verification step after deployment. The local test suite stubs the mail provider.
