# Fingerprint app lock

App lock resumes an already authenticated ERP session. Normal login requires a
password and existing MFA; passkey sign-in is not available. App unlock does not
repeat company email/authenticator verification on every return.

## Setup

1. Sign in normally and open **Security & 2FA**.
2. Use **Set up this device for app unlock**. On Windows, select **Set up Windows
   Hello on this PC**. A registered phone does not configure the computer.
3. Select **Enable fingerprint app lock** and approve device verification.

Windows must have Hello configured under Settings > Accounts > Sign-in options.
Fingerprint recognition needs a compatible, configured sensor; the device may
also offer face recognition or a PIN. ERP cannot enable or inspect fingerprints,
force fingerprint over PIN, or rename the operating system's passkey dialogs.
The setup requests a platform authenticator and a client-device hint. Unsupported
built-in verification displays setup guidance rather than a phone registration
chooser. A non-secret, account-scoped browser hint remembers the selected device
credential. Server ownership, signature, and user-verification checks still
control access; editing localStorage grants no access.

## One-minute background grace

- A brief Alt+Tab, tab switch, or minimize/return does not require another scan.
  ERP locks after **one minute away**, with an immediate privacy cover while
  hidden. Return within the minute validates/renews the existing grant before
  revealing the workspace; it does not request a biometric again.
- Browser blur alone is not an absence signal. Table filters, native dropdowns,
  and controls that temporarily change focus do not start a lock. Normal SPA
  navigation, filter query changes, document refresh and a quick app reopen
  preserve a valid grant rather than forcing a new unlock.
- Visible ERP tabs renew the shared browser session. BroadcastChannel activity,
  scoped to the authenticated session, postpones automatic locking in another
  background ERP tab. Leaving one tab must not lock an actively used ERP tab.
- **Lock now**, explicit lock-screen navigation, credential revocation and an
  invalid/expired server grant still require verification immediately. An
  expired grant cannot be renewed by a heartbeat or background notification.
- After the grace expires, tap **Unlock ERP** for device verification. Cancel or
  failure leaves ERP locked. **Sign out and use normal login** remains available.
  A fresh login creates a new session; enable app lock again for that session.

The setting applies to the current signed-in browser/PWA session. Other devices
and accounts are configured separately. Manual lock broadcasts still lock the
other tabs in that same session immediately.

## Server and privacy enforcement

A stable random appSessionId in the signed authentication JWT identifies the
session. An additive SecurityAppLock table stores enrollment and a hashed random
unlock grant. Node middleware checks protected pages, APIs (including paths with
file extensions), and Server Actions. Expired/locked APIs return 423; documents
redirect to /unlock. Public customer GET pages and the narrow auth/recovery/lock
protocol remain reachable. Passkey management is protected while locked.

Device verification uses account/session/version-bound, single-use challenges
with five-minute expiry, trusted HTTPS origin and relying-party checks, required
user verification and registered public-key signatures. Lock/disable rotates the
version so a stale verification cannot undo a newer lock. Turning off app lock
requires an unlocked session and the current password.

Visible, unlocked pages renew an active 90-second grant every 20 seconds. On
background or page hide, a keepalive suspension shortens it to the one-minute
grace. The client also checks elapsed absence on return/BFCache restore, even
when background timers were suspended. If the OS kills the process before that
notification arrives, the previously issued active grant expires within 90
seconds. No request can revive an expired or explicitly revoked grant.

The previous one-use document-entry restriction is no longer enforced, because
it caused normal filter navigation and refresh to relock ERP. Its legacy database
column is retained to avoid a destructive migration; it grants no authorization.

The privacy cover hides private content, dialogs and popovers. The lock dialog
owns keyboard focus while locked. Forms are retained for resuming unsaved work.
Cross-document view-transition snapshots are disabled with app lock. Web/PWA
code cannot promise to suppress every OS thumbnail/screenshot or protect loaded
memory from developer tools. Business data is not available offline. The normal
session and current MFA policy must remain valid before unlock is accepted.

## Verification

- npx tsc --noEmit and targeted ESLint.
- npm run test:passkeys: temporary SQLite and libSQL databases, virtual CTAP2
  registration/signatures, platform/current-device selection, account/session
  isolation, grace/refresh/filter access, expiry, replay, revocation, existing
  password/MFA login, and rejection of removed passkey sign-in operations.
- node scripts/tests/app-lock.ui.mjs: 320/390/1440px layouts, filter focus,
  brief switches, elapsed background grace, multi-tab activity, privacy cover,
  dialog retention, cancellation/retry, restore/reopen and explicit expiry.
  Browser time is advanced for long-absence checks; no minute-long sleeps.
- npx tsx scripts/tests/app-lock.next-smoke.ts: real isolated Next middleware
  and root compilation, API/file-extension gates, filter document navigation,
  status and immediate manual revocation.

UI responses are fixtures; crypto and database tests verify actual signatures.
Screenshots/logs are under ignored tmp directories. Tests do not change production
configuration, enroll real users, or access the live database. Real Windows Hello,
phone biometrics and app background behavior still need physical-device testing
at the configured HTTPS ERP origin before rollout. See passkeys.md for setup.
