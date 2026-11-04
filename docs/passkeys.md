# Device credentials for fingerprint app unlock

Every signed-in user can manage personal passkeys at `/settings/security`.
On supported mobile devices, an account with no registered passkeys gets a
dismissible enrollment dialog after a recent sign-in, outside Security Settings.
“Remind me in 7 days” and “Don’t ask again” are
saved per user on the server. Closing the dialog also snoozes it for seven days.
Settings can re-enable reminders and always offers adding another passkey.
An account can have up to ten named passkeys. Enrollment requires the current
password and a session signed in within ten minutes; older sessions must sign
out and back in. Removing a passkey requires the current password.

The browser controls fingerprint, face, device PIN, security-key, and phone
approval choices. ERP never receives biometric data and cannot force fingerprint
over a device PIN. Synced passkeys may work across devices; an account's existing
passkeys are not necessarily available on every device. There is no automatic
native biometric prompt without clicking Enable now or Unlock ERP.

Registered passkeys are used only for fingerprint app lock, which resumes an
already authenticated ERP session. Passwordless/passkey sign-in is not offered.
Normal login requires the account password and any configured company email,
authenticator or recovery verification. The old login-options/login-verify
operations are rejected; legacy sign-in proof cookies have no authorization role.
See `app-lock.md` for enabling and using return-to-app locking.

## Deployment

Set `PASSKEY_ORIGIN` to the exact public HTTPS ERP origin, for example
`https://erp.example.com` (no path). `AUTH_URL` or `NEXTAUTH_URL` is accepted as a
fallback. Production refuses passkeys without a configured HTTPS origin.
Development accepts `http://localhost:<port>`. Origin and relying-party ID are
verified server-side; forwarded host headers cannot choose the relying party.
Keep the public hostname stable: credentials registered to one relying-party
hostname do not automatically work on another hostname or a preview deployment.
Retain the existing stable authentication secret and database configuration.

Two additive tables, `SecurityPasskey` and `SecurityPasskeyChallenge`, initialize
through the same runtime-schema pattern as the existing authenticator feature.
No destructive migration or bulk enrollment runs. Credentials store public keys,
signature counters, owner, label and timestamps; private keys stay with the
authenticator/provider. Challenge tokens are random, hashed in storage, expire
after five minutes, and use atomic single-use consumption. Expired tokens are
cleaned on issue. Removing a registered credential prevents it from unlocking
the app. Credentials, existing app-lock settings and signed-in sessions are not
deleted when removing the passkey sign-in feature. Existing company/personal MFA
session invalidation continues to apply.

The SimpleWebAuthn v13 libraries are installed under `erp-webauthn-server` and
`erp-webauthn-browser` npm aliases. NextAuth beta's optional built-in WebAuthn
provider expects v9; aliases avoid overriding that unrelated peer dependency.
The ERP uses its existing password credentials provider for login. WebAuthn is
used only for enrollment and verification of an existing session app lock.

## Verification and rollout

- `npx tsc --noEmit`
- `npx tsx scripts/tests/passkeys.integration.ts`
- `npx tsx scripts/tests/passkeys.integration.ts --libsql`
- `node scripts/tests/passkeys.ui.mjs`
- `npx tsx scripts/tests/security-login.integration.ts`
- `node scripts/tests/authenticator.ui.mjs`

The integration test creates an isolated temporary database, uses a Chrome
virtual CTAP2 authenticator for real registration and signed assertions, and
exercises actual Auth.js callbacks. It covers invalid signatures, single-use
challenges, account/session isolation, password/recent-login enrollment, MFA
enforcement, expiry, concurrent consumption and credential removal. It also
checks that old login operations and old proof cookies cannot replace a password. UI tests use
explicit browser/API fixtures and verify 320/390/1440px layouts and reminder
preferences. Screenshots are in ignored `tmp/passkeys-ui`.

Before production rollout, configure the HTTPS origin and test enrollment,
cancel, app unlock, password login with existing MFA, and removal on a real Android phone, iPhone,
Windows Hello laptop and/or Mac as applicable. Virtual authenticators do not
prove real OS biometric dialogs or device synchronization. This implementation
does not deploy the app, change production configuration, enroll any real user,
or alter the production database during tests.
