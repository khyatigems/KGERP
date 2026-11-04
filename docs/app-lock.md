# Fingerprint app lock

App lock resumes an already authenticated ERP session. Normal login uses a
password and existing MFA; passkey sign-in is not available. App unlock does not
repeat company email/authenticator verification
every time the app returns from the background.

## Enable and use

1. Sign in normally and open **Security & 2FA**.
2. In **Set up this device for app unlock**, enter your password and register
   this device. On Windows, select **Set up Windows Hello on this PC**. An
   existing phone registration does not configure the computer.
3. Select **Enable fingerprint app lock** and approve device verification.

The setting applies to this signed-in browser/PWA session, on mobile or desktop.
Closing/reopening, minimizing, switching tabs/windows, and restored pages lock
the app. The lock screen appears automatically; tap **Unlock ERP** for the
browser's fingerprint, Face ID, Touch ID, Windows Hello, security-key or device
PIN prompt. The device chooses its supported verification methods; a website
cannot require fingerprint instead of an allowed device PIN. Passkeys may be
synced or approved using another device, depending on the platform.

Cancellation and verification failure leave ERP locked. **Lock now** is available
in Security Settings. Turning app lock off requires an unlocked session and the
current password. **Sign out and use normal login** is available if the passkey
is unavailable; it requires the existing login and MFA/recovery process. A fresh
login creates a new session: enable app lock again for that session. Other
devices and accounts are not enabled automatically. Tabs sharing the same login
session share its server lock; a lock broadcast immediately covers other tabs
when BroadcastChannel is available.

## Enforcement

- A stable random `appSessionId` in the signed authentication JWT identifies the
  browser session. Existing JWTs adopt their original token ID on refresh.
- An additive runtime table, `SecurityAppLock`, stores enrollment and a hashed,
  random unlock grant. Neither localStorage nor sessionStorage authorizes access.
- Node.js middleware checks the session's lock before protected pages, API routes
  and Server Actions. Locked APIs/actions return 423; document navigation goes
  to `/unlock`. API paths with file extensions are explicitly included in the
  matcher. Customer-facing public GET pages and the narrowly scoped auth/recovery
  protocol remain reachable; passkey management is protected while locked.
- Unlock challenges are single use, five-minute, account/session/version bound,
  and use the existing trusted HTTPS origin and relying-party configuration.
  User verification and real registered public-key signatures are required.
  Enabling, disabling and locking rotate the lock version, so an in-flight old
  verification cannot undo a newer lock or disable operation.
- Grant cookies are HttpOnly and SameSite Strict. Grants expire after 60 seconds
  unless a visible, unlocked page renews them every 20 seconds. A closed/killed
  browser cannot renew a stale grant. Removing the credential also rejects it.
- A protected full document reload/open requires a new unlock even if a previous
  grant is still within its lease. Only the immediate navigation after a verified
  unlock receives one atomic, single-use document entry. Ordinary SPA navigation
  works within the active grant.
- Background/page-hide events synchronously cover the workspace and send a
  keepalive lock request. Foreground/BFCache restore checks keep it covered. A
  generation guard prevents a stale status request from revealing a newer lock.
  The system biometric dialog itself may blur/hide the window, so verification
  is distinguished from leaving the app; closing during verification invalidates
  that attempt. Private requests are paused on the client while locked, and the
  middleware remains the independent server enforcement.
- Cross-document view transitions are disabled while checking security or using
  app lock, preventing a retained workspace snapshot fading over the lock screen.
  Mounted forms are hidden/inert after an in-place lock so unsaved input survives
  verification; newly opened locked app instances do not mount private content.

This is a web/PWA app lock, not an OS-native secure screen. Browsers do not
reliably deliver a final event when the OS kills a process. Normal close/background
revocation is immediate when its request arrives; the 60-second server lease is
the upper bound if delivery is lost. Reopening a document still requires a fresh
unlock. A PWA cannot promise to suppress every OS task-switcher thumbnail or
screen capture, or protect already-loaded memory from browser developer tools.
No business data is made available offline. The existing server session and MFA
policy must still be valid before an unlock is accepted.

## Verification

- `npx tsc --noEmit` and targeted ESLint checks.
- `npx tsx scripts/tests/passkeys.integration.ts` and the `--libsql` variant:
  virtual CTAP2 signatures, enable/unlock, cross-session isolation, API/action
  gates, new document entry, expiry, heartbeat, challenge replay, lock/verification
  races, disabling and credential revocation, alongside normal sign-in/MFA tests.
- `node scripts/tests/app-lock.ui.mjs`: 320/390/1440px layouts, actual tab
  background/return, hidden/inert workspace, client request pause, native-dialog
  blur, cancel/retry, BFCache restore, close/reopen and unlock navigation. UI
  signatures/API responses are explicit fixtures; integration tests check crypto.
- `npx tsx scripts/tests/app-lock.next-smoke.ts`: starts an isolated Next dev
  server with a disposable database, compiles the actual Node middleware/root
  providers, verifies real API/extension gates, lock-page navigation and grant
  revocation. It does not run production build, migration or deployment scripts.
- Existing security-login/authenticator and passkey UI regressions remain relevant.

Screenshots and logs are in ignored `tmp/app-lock-ui`, `tmp/app-lock-next-smoke`
and `tmp/passkey-checks`. No production configuration, user enrollment, or live
database is changed by these tests. Before rollout, test actual close/reopen,
app switching and native verification on the intended phones and laptops at the
configured HTTPS ERP origin. See `passkeys.md` for origin and passkey setup.

## Windows Hello and current-device setup

Device enrollment explicitly requests a platform authenticator and the
client-device hint. On Windows this requests the built-in verification flow,
with Windows/provider control over the exact UI. Configure a Windows Hello PIN
and, for fingerprint use, a compatible sensor and Fingerprint recognition in
Windows Settings > Accounts > Sign-in options. ERP cannot enable a sensor,
inspect enrolled fingerprints, or force fingerprint instead of the device PIN.
A failed platform-capability check displays setup guidance instead of starting
an unrelated phone/security-key registration flow.

The browser remembers the newly registered credential ID under the current
account as a non-secret device-selection hint. Enable/unlock requests prefer
that registered ID with internal transport and a client-device hint. The server
validates ownership, binds selection to the one-use challenge, and still checks
the signature and user verification. Editing localStorage grants no access. If
storage is unavailable, normal signature-verified account credentials remain
available; existing users are not silently migrated or deleted. OS dialogs may
still say "passkey", which is the WebAuthn credential used for app unlock, not a
passwordless ERP sign-in option.
