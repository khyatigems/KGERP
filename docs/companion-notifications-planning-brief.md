# KhyatiGems ERP: Companion and notification planning brief

Prepared 6 November 2026 from the current repository implementation. This is a
product planning document: current capabilities and proposed work are separated.
No companion or notification behavior was changed for this review. This review
covers the in-app companion, bell, action feedback and marketplace progress UI.

## 1. Product purpose

The companion is a personal ERP assistant interface that brings updates, action
feedback, relevant shortcuts and a daily review checklist into one small panel.
Its gemstone character gives the interface personality. Its practical value is
helping a user notice an update, understand it, and reach the next useful action.

The current implementation is driven by existing ERP events and predefined
rules. It does not use an AI model, independently analyse the whole business,
or perform business transactions on its own.

## 2. What the companion currently offers

### Appearance and character

- Five local SVG characters: Facet (emerald), Azure (sapphire), Amara (amethyst
  owl), Ember (amber fox), and Jade (sprout-topped crystal keeper).
- Adjustable character size from 48 to 144 pixels; default 80 pixels.
- Four corner positions, plus free movement using a drag grip or keyboard arrows.
- Account-saved appearance, position and shortcut preferences.
- States for idle, greeting, working, success, notification, warning, sleeping,
  smile, wink and resting. These are presentation reactions to events and activity.
- Brief hover/focus gestures, an optional session greeting, and optional
  encouragement. After 60 seconds of inactivity, the character can rest; user
  interaction or new feedback wakes it. This timer is separate from app locking.
- Animation preference, device reduced-motion support, Quiet mode and manual Rest.
- Right-click opens customization; Style and Settings also provide controls.

### Four panel sections

| Section | Existing functions | Important boundary |
| --- | --- | --- |
| Inbox | Saved notifications, search, All/Unread/Needs attention filters, individual acknowledgement, mark all read, record links, older-history loading, retry failed loading, permitted marketplace retry actions | Opening the panel does not automatically mark saved items read |
| Activity | Success, info, warning, error and loading feedback; operation updates; custom cards; action/cancel buttons; search and filters; acknowledgement | Latest 100 records in browser memory for the current account; full reload ends transient history |
| Workday | Personal daily review links for missing media, receivables, inventory aging and marketplace sync; checkboxes; pinning shortcuts | Checkboxes are user-marked review notes, not proof that a business issue was resolved |
| Style | Character and size customization with an apply action | Preferences are account-specific |

Quick actions are filtered by permissions, prioritize pinned links and the
current area of the ERP, and display four actions. Available destinations include
inventory creation, inventory, missing media/certificates, certificate readiness,
marketplace orders, connections, sync history, reports, receivables, inventory
aging and operational reports.

### Availability

The companion is disabled by default. Its current settings page and preference
writes require `settings:manage`. It appears only when enabled and the viewport
is at least 1024 CSS pixels wide and 600 pixels tall. Phones and smaller/shorter
windows retain normal bell and toast behavior. Responsive hiding does not erase
the saved desktop preference. The sidebar Appearance area provides Show/Hide.

## 3. How notifications currently work

There are several related surfaces, with different purposes and lifetimes.

| Surface | Purpose | Persistence |
| --- | --- | --- |
| Inline feedback | Field validation and warnings beside the affected controls | Owned by that page/form |
| Ordinary toast | Immediate feedback from an action, including action buttons and loading/results | Transient |
| Saved notification/bell | Important recorded business activity and operational failures | Database-backed per user |
| Companion Activity | In-session view of action feedback | Account-scoped browser memory, bounded to 100 records |
| Marketplace progress | Specialized sync progress, results, failures and retry feedback | Native transient UI, with persistent failure events where implemented |

When the companion is active, ordinary toast feedback is routed into its
Activity section. Marketplace sync feedback remains visible in its native UI
and is also captured in Activity. Clicking the bell opens the companion Inbox.
When the companion is disabled or hidden, normal toast and bell behavior resumes.
The adapter handles operations that finish after a visibility change.

Saved event producers currently include inventory creation, purchases,
quotations, sales/invoice activity, invoice payments, report export results and
marketplace sync failures. This is implemented coverage, not a claim that every
ERP action produces a saved notification.

The shared routing policy sends routine success and recoverable errors to
transient feedback, contextual warnings to inline UI, and important activity or
operational failures to persistent notifications. Individual workflows must
still call the appropriate producer; returning a route alone does not save an
event.

Saved notifications have info/success/warning/error severity, timestamps, links
and read state. User/event-key deduplication preserves the first event's read
state and timestamp. The feed normally requests 20 items and supports bounded
cursor pagination. It refreshes on mount, focus, returning to a visible tab and
every 60 seconds while visible; the companion adds no separate polling loop.

Collapsed companion alerts use a queue capped at five, with a nine-second
display interval and session deduplication. Automatic alerts, Quiet, Rest and
tab visibility influence interruptions; history remains available. Error
feedback sanitizes common raw database/server exception text. Notification reads
and read-state writes are restricted to the signed-in user.

## 4. Current gaps and decisions to address

1. **Consistent alert preferences.** The attention-only preference filters saved
   notification alert candidates, while Activity alert candidates currently use
   a separate selection path without the same severity filter.
2. **Consistent read behavior.** The native bell marks an unread event read when
   its record link is opened. The companion's Open record link does not; it has
   a separate Acknowledge action. Decide the intended shared behavior.
3. **Reading versus resolution.** Acknowledgement records attention, not recovery.
   A failed sync or overdue task needs a separate verified resolution state if
   the product is to display it as resolved.
4. **Cross-channel grouping.** Persistent events deduplicate by event key and
   Activity entries update by toast ID. A shared event identity could group the
   toast, saved event, progress and eventual recovery into one business story.
5. **Priority and noise.** The bounded alert queue does not implement a complete
   severity-priority, cooldown, burst summary or escalation policy.
6. **Durability.** Important Activity feedback can disappear on reload unless its
   workflow also produces a saved notification. Decide which outcomes warrant
   persistence; action callbacks themselves should never be serialized.
7. **Scope of search.** Inbox search filters notifications already loaded into
   the panel, not the entire saved history on the server.
8. **Reminders and delivery.** Manual Rest has no timed deadline. Scheduled quiet
   hours, per-category rules, digest schedules and browser push delivery are not
   part of the reviewed companion flow.
9. **Mobile and staff access.** Decide whether a notification-focused mobile
   panel and ordinary staff access are wanted; the existing character is desktop
   only and preference management is gated by settings permission.
10. **Business awareness.** Workday currently offers predefined review links. It
    does not calculate live issue counts or automatically confirm completion.

## 5. Recommended joint direction

One business event should have a stable identity and clear lifecycle; the
companion, bell and transient UI should present appropriate views of it.
Presentation preferences should not determine whether a significant event is
retained. Business operations must remain permission-checked and user-initiated.

### First priority: reliability and predictable behavior

- Apply severity/category preferences consistently across saved and transient
  alerts. Agree on which events may interrupt, stay silent or enter a digest.
- Standardize the meanings of New, Read, Acknowledged and Resolved.
- Group related updates and suppress repeat interruptions across channels/tabs.
- Add timed snooze and optional quiet hours, while retaining searchable history.
- Ensure notification delivery failures do not incorrectly change a completed
  business operation into a reported transaction failure.
- Keep mobile/disabled-companion fallback and in-flight operation handoffs tested.

### Second priority: useful business follow-up

- Add permission-filtered, server-backed attention cards for missing product
  media/certificates, outstanding receivables, stuck marketplace jobs, failed
  exports and packaging issues. Establish exact triggers before implementation.
- Each card should explain what happened, affected records, freshness and the
  next available action: Open, Fix details, Retry, Download or Review.
- Provide safe bulk review actions for groups of related updates.
- Add a daily review digest with verified counts and links to the existing
  filtered reports. Do not present estimates or manual ticks as confirmed facts.

### Third priority: polish and reach

- Use one visual language for priority, actions, timestamps and progress across
  companion, bell and native feedback, consistent with the Unslop design work.
- Add a mobile notification center using the same underlying event state.
- Consider optional sound or browser push only after defining permission,
  privacy, delivery, quiet-hour and duplicate-handling rules.
- Improve character expressions and restrained transitions where they convey
  useful state, with keyboard access and reduced-motion support throughout.
- Consider AI summaries later, only if verified event summaries and permission
  boundaries cannot meet the need with simpler rules.

## 6. Example target experiences

| Situation | Proposed notification behavior | Proposed companion behavior |
| --- | --- | --- |
| Routine inventory save | One concise success; avoid a repeated saved alert unless justified | Brief success reaction and optional View item action |
| Marketplace sync fails | Persistent issue linked to the job; group repeats | Attention card with permitted Retry; retain until verified recovery |
| Report export completes | Saved completion with an authorized download destination | Announce once, then keep the result discoverable |
| Many records lack certificates | Grouped readiness summary with a report link | A single actionable review card rather than one alert per SKU |
| User is applying filters or switching apps briefly | Preserve existing app-lock grace and avoid unrelated interruptions | Stay quiet; no focus stealing |
| User opens ERP on mobile | Same saved notification state and actions | Compact notification panel; character remains optional |

These are planning proposals, not implemented behavior guarantees.

## 7. How to judge success

Track repeated interruptions per business event, time to find an affected
record, successful follow-up/retry completion, unresolved issue age, mobile
usability, notification delivery latency and user dismissal/mute rates. Establish
baselines before claiming improvement. Performance checks should include large
histories, long-running jobs, multiple tabs, reloads and viewport changes.

The next planning deliverable should be an event catalog: trigger, recipient,
permission, priority, persistence, interruption policy, primary action,
deduplication key and resolution rule for each event. That catalog will let the
companion and notification system evolve together without conflicting behavior.

Source basis: the existing companion documentation and implementation,
preference schema/actions, bell/feed API, notification persistence/routing,
ERP feedback wrapper and inspected business event producers. This review did
not re-run the full companion test suite or inspect a live account's settings.
