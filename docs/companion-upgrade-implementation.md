# Companion and notification upgrade — implementation record

## Scope and existing architecture

This extends the existing system. No new conversation engine or notification backend
was introduced. Unrelated workspace changes were present before this work and retained.

| Area | Existing source of truth | Change |
| --- | --- | --- |
| Persistent events | `lib/notifications.ts`, Prisma `Notification` | Additive review timestamps; original keys and duplicate semantics retained |
| Producers | Inventory, sales, purchases, quotes, invoices, report-export worker, marketplace worker | Existing persistence retained; inventory/sales feedback shares producer identity; marketplace recovery verified from stored jobs |
| Feed | `app/api/notifications/route.ts`, `NotificationBell`, shared external store | Existing refresh schedule retained; server-side bounded search and review actions |
| Companion | `CompanionHost`, `Companion`, feedback hook, gestures and drag hooks | Shared history component, priority, cooldown, quiet hours, category silence, timed Rest |
| Activity/toasts | Existing Sonner wrapper, persistent feedback toaster | Existing callbacks remain transient; identity association stores identifiers only |
| Preferences | Account-specific `Setting` key `companion:v1:<userId>` | Compatible schema defaults for quiet hours and muted categories |
| Permissions | Existing authenticated session and module RBAC | Source checks remain server-side; staff retain native bell access; Companion settings still require `settings:manage` |
| Workday | Existing permission-filtered report links and local checklist | On-demand verified attention snapshots; checklist remains explicitly manual |

The bell continues its existing mount/focus/visibility/visible-minute refresh. Search
requests run only when history is mounted, are debounced, abort superseded requests and
retain cursor pagination. The Companion adds no business-data polling. Local quiet-hour
and Rest clocks do not issue network requests. Attention refresh is manual/on-mount.

## Lifecycle and API compatibility

Existing `{ id }` and `{ all: true }` PATCH calls still mean **read**.
New optional `action` values are `read`, `acknowledge`, `snooze`.
Acknowledgement is separate from resolution and also records that the notification was
read. Bulk acknowledgement/snooze require explicit IDs (maximum 100); unbounded bulk
review only supports marking read. Snooze accepts 1–10080 minutes.
Every write includes the authenticated `userId`. There is no client resolution action.

Nullable `acknowledgedAt`, `resolvedAt`, `snoozedUntil` fields are the only database
field additions, plus a user/time/ID index for history pagination. They are necessary because `readAt` cannot represent independent review,
recovery and timed suppression. Existing IDs, keys, timestamps, relations and rows are
preserved. The additive migration and existing runtime bootstrap support older databases.
Use the project's established safe migration workflow; plain Prisma migration deploy can
encounter already-present columns after runtime bootstrap. No production migration was
run during development. Regenerate Prisma and restart a running development server after
schema changes. Windows regeneration can report a locked engine DLL while a server is
running; generated-client integration tests are still required before deployment.

GET accepts `q` (maximum 200 characters), `state`, `severity`, `category`, `limit` and
the existing cursor/offset. Search is performed in the authenticated user's database
history, not only loaded rows. Original four severity values remain compatible; no
existing error was arbitrarily relabelled critical. The shared history component is used
by both bell and Companion, including mobile bell access, safe record links, timestamps,
review status, bulk acknowledgement, per-event and bulk timed snooze, and permitted retry.

Opening a record marks it read; viewing an individual speech-bubble update also marks
that saved event read. Merely opening the history panel does not mark every row read.
Native and Companion review writes refresh sibling tabs through a storage signal.
Record destination routes and retry endpoints remain authoritative for permissions.

## Identity, interruptions and recovery

- Existing saved event keys remain immutable and unique per user.
- Shared helpers align inventory-created and sale-created feedback with their saved keys.
  Inventory's existing progress toast ID is retained and associated with the eventual event
  after verified creation. Export terminal keys group under a common presentation story.
- Saved and Activity candidates share severity/category/quiet-hours rules. Duplicate keys
  within one batch are removed, errors precede warnings, and at most five alerts queue.
- A bounded account-scoped ledger retains up to 200 claims for 24 hours and a 30-second
  interruption cooldown. Web Locks serialize competing tabs when available. Browsers
  without Web Locks use best-effort local storage; unavailable storage degrades to
  in-session suppression. Cross-device interruption suppression is not implemented.
- Suppression never deletes history. Event snooze rearms an unread saved event at its
  deadline. Manual Rest supports 15 minutes, one hour or explicit wake, persists on the
  device per account, and synchronizes across tabs. Quiet hours use device-local time;
  equal start/end means quiet all day.
- Marketplace retry writes a server-owned mapping in existing Settings. Queueing or
  partial results do not resolve failures. Only stored `SUCCESS` with zero failed records
  resolves mapped failures of the same shop and sync type, including a bounded retry
  chain. Notification linkage/delivery failure cannot fail an already queued/successful
  operation. Retry API errors no longer include raw server exception text.

## Verified attention sources

| Card | Exact condition | Permission and destination |
| --- | --- | --- |
| Missing photographs | In-stock, no primary image and no IMAGE/image media | `reports:view`; existing missing-media report |
| Missing certificate numbers | In-stock, both number fields null/empty/whitespace | `reports:view`; existing missing-media report |
| Failed exports | Current user's saved export jobs in FAILED state | `reports:view`; report operations |
| Marketplace review | Current user's FAILED/PARTIAL jobs or PROCESSING jobs with no update for two minutes, excluding verified resolved notification issues | `listings:view`; sync history |

Cards are snapshots with query time, condition, scope, priority and review link. Source
failure produces an unavailable message, never a zero or estimate. The inventory snapshot
matches the existing missing-media report and includes all its in-stock records; it is
not a replacement for the dashboard's separate per-SKU attention-visibility controls.
Historical job states remain historical even after recovery; the report may show them
alongside successful retries. No financial totals or customer details are added.

## Visuals, dependencies and accessibility

Purple/cream/gold speech bubbles retain dock-aware directional tails and add a finite
speaking indicator and Rest control. Existing drag, keyboard movement, app-lock grace,
in-flight toast handoffs, quiet mode, focus behavior and native mobile fallback remain.
History inputs and actions participate in bell focus trapping; automatic alerts never
take focus. Reduced-motion disables new responses. All 22 supplied official poses are active with portrait/full-body selection and a preview
library. The supplied thinking video plays silently during actual Workday processing
or explicit preview, with visibility, quiet and reduced-motion controls. See
`companion-avatar-handoff.md` for the asset catalog and preparation workflow.

References reviewed: [Rive React](https://github.com/rive-app/rive-react),
[React Bits](https://github.com/DavidHDev/react-bits),
[Motion Primitives](https://github.com/ibelick/motion-primitives),
[Assistant UI](https://github.com/assistant-ui/assistant-ui),
[CopilotKit](https://github.com/CopilotKit/CopilotKit),
[Sonner](https://github.com/emilkowalski/sonner).
Existing Sonner and Radix cover the current presentation. Rive requires an authored rig;
the other engines/components would overlap existing behavior. No runtime dependencies
were added, so no incremental third-party bundle or licence obligations were introduced.
Any later installation needs its own version/licence/bundle review.

## Validation and remaining acceptance work

Coverage added for lifecycle separation, forbidden resolution, malformed bulk requests,
cross-user review protection, composed server search and old-history retrieval, stored
marketplace recovery, permission-filtered counts, whitespace certificate conditions,
overnight quiet hours, category suppression, snooze, shared identity and cooldown.
Browser fixtures exercise desktop/mobile fallback, history, action callbacks, keyboard
Escape, reduced motion, dock geometry, settings persistence and competing tabs.
Fixtures deliberately reset the cooldown between independent visual scenarios.

Still pending: an authored Rive rig and rig-based natural blinking/talking; complete producer-by-producer identity
rollout (beyond inventory, sales and export story grouping); digest scheduling, burst
summaries and critical escalation; live receivables/order/packaging cards after exact
source rules are agreed; broader staff Companion settings policy; cross-device suppression;
production-volume performance/load testing and production rollout. Existing important
server-produced activity persists; arbitrary transient Activity is not automatically
trusted as proof of a completed operation or uploaded to the database.

No measured business improvement is claimed. Pre-change implementation observations
were a five-alert queue, nine-second display, session-only suppression, loaded-row search
and separate Activity severity selection. Real baseline telemetry for interruption rate,
record-finding time, successful follow-ups, issue age, delivery latency, dismissal/mute
rates, mobile usability and large-history latency was unavailable in this local task.
Collect those metrics in a permission-controlled staging/pilot environment before
comparing outcomes or claiming improvements.
