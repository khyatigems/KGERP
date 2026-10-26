# Work Tracker sync lockout — 26 October 2026

## Findings and confidence

Reported symptoms: extension `Failed to fetch`, changing settings blocked by pending activity, and ERP `Chrome is connected to another ERP address`. The user supplied `http://localhost:3000` when asked for the saved and normal ERP addresses, but did not identify both addresses separately. The installed extension settings, network trace and actual uploads have not been inspected. The specific original network failure therefore remains unconfirmed.

The code establishes this failure chain: status compares the saved ERP address to the open page's origin before making a verification request. A different origin produces `other-erp`; upload still targets the saved origin. A stopped localhost server cannot receive uploads. Configure, reconnect and disconnect all reject a nonempty queue. Consequently, a stale/unreachable address plus queued activity locks the user out of correcting the connection without discarding/exporting work. Raw fetch exceptions obscure the address and recovery action. The old code offers no address-only repair path.

Two additional defects worsen recovery: any expired record aborts the entire queue, and a successful 100-record batch schedules only recent buffered events, leaving an existing eligible backlog for later periodic alarms. Raw address comparisons and unnormalized upload URLs also mishandle equivalent legacy address formatting, although current settings validation normally canonicalizes new connections; this is a defensive fix, not confirmed as this incident's trigger.

## Changes in extension 1.2.2

- Normalize safe ERP origins on read, comparison and API calls. Do not follow redirects with bearer credentials.
- Add an explicit Settings address repair action. It verifies the existing token at the entered origin and requires the same saved credential ID. Legacy profiles without an ID must verify the original connection to establish identity. Unrecognized/revoked access and unverifiable identity remain blocked.
- Verify outside the serialized sampling queue, then check for concurrent connection changes before committing. Preserve queued activity, capture the last interval, preserve current tracking preferences, and reset retry state. Immediately attempt sync using the repaired address.
- Show saved address, pending count, last upload and connection errors in Settings, plus a manual sync action. ERP directs address mismatches to repair instead of a mandatory disconnect.
- Retain expired activity for export while uploading valid records. Schedule another upload after one second when a full batch is accepted and eligible work remains; partial acknowledgements retain normal periodic retry behavior.
- Improve network errors with the attempted origin and site-access/recovery guidance. Reset retry state when the user clears the queue.

## Validation and rollout

`npm run test:work-tracker` passes: domain/idle/unit checks, isolated SQLite/API integration, actual service-worker logic with mocked Chrome boundaries, and pairing/security checks. Added regressions cover equivalent origins, normalized request URLs, localhost repair, queue retention after upload failure, later successful upload, identity mismatch/401 refusal, legacy identity verification refusal when offline, expired-plus-valid queues and continuation alarms.

Rebuild with `npm run build:work-tracker-extension`. Replace files in the installed unpacked extension's existing folder and click Reload in `chrome://extensions` (retain the folder/profile to retain storage). Reload ERP after updating. Use the new Settings repair action with the intended working ERP origin. If the intended origin is localhost, start that local server. The live installation, permission prompts, real credential acceptance and uploaded totals still require verification in the user's Chrome profile. No production deployment, credential replacement, queue deletion or business-data migration is part of this fix.
