# Facet ERP Companion

Enable or disable Facet in **Settings → ERP Companion**. Preferences belong to the authenticated administrator and require the existing `settings:manage` permission. The feature starts disabled and uses the existing Prisma/libSQL infrastructure with no schema migration or added runtime dependency.

## Unified notifications

- **Inbox:** all saved bell events, including read notifications. Search, All/Unread/Needs attention filters, mark one or all read, direct record links, permission-aware marketplace retry controls, error retry and older-history pagination.
- **Activity:** native ERP feedback, including info, warnings, errors, successes, loading states, custom inventory save cards, promise results and action/cancel buttons. Reusing a toast ID updates one activity record. The latest 100 records are held in memory for the current account in this browser session; action callbacks are never serialized into storage or sent to the server. Full reloads end transient history. Saved Inbox events retain their existing database persistence.
- While the companion is visible on a supported desktop viewport, ordinary toast feedback is routed into Facet. Marketplace sync progress/results and sync queue/retry errors retain their native toast display and also appear in Activity. Existing inline validation, confirmation dialogs and page-level warnings are intentionally preserved.
- The bell remains visible as an unread indicator. While the companion is visible, clicking it opens Facet's Inbox. When disabled or automatically hidden on a small screen, its original panel works normally.
- When collapsed, Facet displays a bounded queue of concise alerts with a View update/activity action. Session deduplication prevents repeated announcements of the same saved event; reading the panel does not silently mark saved notifications as read. Quiet mode, Rest, inactive tabs and Automatic alerts preferences suppress interruptions. These preferences do not hide history.
- In-flight operations may finish after enabling/disabling Facet. A persistent Sonner adapter reconciles their destination so completed feedback is not lost. Disabled mode restores ordinary toast delivery. Completed hidden events are retired when the companion unmounts; pending loading operations remain eligible for normal delivery.

No updates are invented. If there are no saved bell events, Activity fills only as real ERP actions produce feedback. A read bell notification is retained in Inbox rather than producing an empty panel. Marketplace notifications refresh through the existing bell's original mount/focus/visibility/60-second mechanism; this feature adds no polling loop.

## Business tools and movement

**Workday** offers a personal daily review of existing missing-media, receivables, inventory-aging and marketplace-sync reports, filtered by the user's permissions. Checkboxes are marked by the user and stored on that browser for the current local date. They do not assert that ERP tasks have been completed or that issues exist. Shortcuts can be pinned to the top four quick actions; pin preferences follow the account across sessions.

Drag the grip above Facet with a mouse or touch, or focus it and use arrow keys. Positions are stored as normalized viewport coordinates and clamped when the viewport changes. Pointer drags save on release; repeated keyboard movements debounce their save. Position and pin writes use the existing authenticated preference action. Save failures leave the position usable for the current visit and report the persistence failure. Selecting a corner in Settings clears a dragged position. Restore defaults resets preferences on the next save.

## Files and integration

- `components/companion/companion-host.tsx`: persistent small layout entry and conditional lazy loading.
- `companion.tsx`, `facet.tsx`, `companion.css`: panel, character, responsive layout and motion.
- `use-companion-feedback.ts`: bounded account-scoped activity history using Sonner's public subscription hook; preserved custom content and actions.
- `feedback-toaster.tsx`: native toast adapter for enable/disable transitions and in-flight promises.
- `use-companion-drag.ts`: pointer/keyboard movement, viewport clamping and preference persistence.
- `companion-settings.tsx` and `app/(dashboard)/settings/companion`: preferences and guarded server action.
- `lib/companion.ts`: validated preferences, safe local record links, inbox filtering and verified existing shortcuts.
- `lib/companion-runtime.ts`: notification routing and marketplace exceptions.
- `lib/companion-notification-store.ts`: the bell's snapshot and its existing refresh/load-more controls.
- Both ERP layouts read the current user's indexed `companion:v1:<user-id>` key. General Settings excludes private companion keys from its system-settings listing.
- `app/api/notifications/route.ts` supports validated date/ID cursors. Pages remain bounded to at most 50 rows, use the authenticated user's condition on every request, and include deterministic ordering for identical timestamps. The old offset parameter remains backward compatible.

## Performance and safety

Local SVG and CSS provide idle, greeting, working, success, notification, warning and sleeping states. Device reduced-motion settings override animation. Hidden tabs pause nonessential motion; event subscriptions and timers are cleaned up on unmount. The enabled companion reuses the bell feed and never scans full inventory or orders. Pagination occurs only on request. Dragging updates local UI during movement and persists after release.

When disabled or automatically hidden on a small screen, the artwork, panel, alerts and drag/visibility listeners unmount. The native toast adapter and existing bell retain their subscriptions to perform ordinary ERP notification work. Preferences still have the minimal listener needed to enable the feature without a reload.

Transient history is bounded to 100 items and alert queue to five. Saved bell history is paginated, not copied wholesale into browser storage. No AI API, external animation service, new database, or subscription is used. No production database migration is needed. This is a description of overhead controls, not a measured performance improvement.

## Verification

```text
npm run test:companion
npm run test:notifications
npx tsc --noEmit --incremental false
npx eslint components/companion lib/companion*.ts lib/erp-feedback.ts components/notifications/notification-bell.tsx
```

Companion unit tests verify preference validation, legacy defaults, routes, safe links, filters, subscription cleanup and routing exemptions. Persistence tests execute the real preference save action against disposable SQLite with session/permission/cache adapters; they verify account isolation, invalid/unauthorized rejection, and fresh-client readback of positions and pins. Browser tests render actual companion, bell, native Toaster, feedback wrapper, settings and inventory save card, with adapters only for Next navigation/lazy loading, authentication-bound save transport and the notification response fixtures. They cover history, automatic alerts, custom content/actions, toast suppression, marketplace exceptions, native fallback, a promise completing after disable, pagination, pinning, dragging, quiet mode, reduced motion and viewport bounds. They do not establish a live authenticated end-to-end deployment check. Screenshots are stored in `tmp/companion-review`.

The notification integration suite uses disposable SQLite to verify authenticated-user isolation, deduplication, read persistence, malformed cursor rejection and complete non-overlapping cursor pages, including equal timestamps. Existing repository-wide lint debt remains outside this feature; companion-targeted lint and production build results should be reported separately.

Final checks on 26 October 2026: `npm run test:companion`, `npm run test:notifications`, the targeted ESLint check (including the new API pagination and test files), and the isolated Next.js production build all passed. The build included its TypeScript check. No production database migration was applied. The existing middleware-convention deprecation warning remains.

## Character customization and gestures

Choose Facet (emerald), Azure (sapphire), Amara (amethyst owl), Ember (amber fox) or Jade (a sprout-topped crystal keeper) in Settings or the companion's **Style** tab. Right-clicking the launcher opens Style directly. All five are original local SVG artwork sharing consistent facial states. The size slider ranges from 48 to 144 pixels; Apply companion saves panel changes, while Settings changes use Save preferences. Size and character persist in the existing account preference JSON, with an 80-pixel default for older preferences. No migration or remote asset service is required.

The launcher is transparent, with a discreet drag grip. Drag and alert geometry account for character size and viewport changes. Settings and panel previews show the selected size.

Hovering or keyboard focus produces a short smile, wink and character-specific gesture. After 60 seconds without pointer, keyboard or scroll activity, the character settles into a resting pose with closed eyes and a small sleep indicator. New interaction or new ERP feedback wakes it. Fresh alerts and active loading operations take priority. Inactivity is a local presentation state and does not imply the business has no pending tasks. Quiet mode and manual Rest take precedence. CSS motion respects both the animation preference and device reduced-motion setting. The idle deadline stops after entering rest, rearms on activity, and is cleaned up with gesture timers/listeners when disabled.

Additional tests cover every character, minimum/maximum size, right-click customization, saved preference readback, hover smile-to-wink, inactivity rest and wake-on-activity/notification. The browser test invokes the real inactivity deadline with a controlled clock rather than waiting a real minute.

Character/gesture verification on 26 October 2026: preference validation and SQLite persistence tests, browser appearance/gesture/notification regression checks, targeted ESLint, TypeScript and the isolated Next production build passed. Local companion sources are UTF-8. No database migration or new dependency was introduced.

## Responsive visibility and sidebar shortcut

The companion renders only when the account preference is enabled **and** the viewport is at least 1024 CSS pixels wide and 600 CSS pixels tall. Smaller tablets, phones, landscape phones and short windows use normal toast and bell behavior. This is an actual component unmount, not just a CSS hide: the companion's notification interception, document suppression marker, gestures and timers are cleaned up. A small-screen first load does not mount the companion even if its saved desktop preference is enabled. Resizing back restores the companion from that saved preference. Responsive hiding never writes `enabled=false` to the database.

**Sidebar → Appearance → ERP companion** offers an immediate Show companion / Hide companion action, separate from the theme preview's Apply button. It persists via the existing guarded preference action and preserves character, size, position and other preferences. The Settings enable switch stays synchronized. Failed saves roll back the optimistic visibility and show an inline error; duplicate clicks are blocked while a save is pending. The control is available only where the existing authenticated companion host is permitted. On small screens it explains that the companion is desktop-only and leaves the saved desktop preference intact.

The bell opens its original panel whenever the companion is not actually mounted. Ordinary native toast messages, custom operation cards and action buttons continue to work; long-running operations finishing after a mobile resize or desktop hide retain normal delivery through the existing toast adapter. No new notification API requests or polling loop are introduced.

Visibility checks cover breakpoint edges, fresh small-screen loads with an enabled desktop preference, resize restoration without preference writes, short-window suppression, native mobile toast actions and bell interaction, in-flight promises crossing a resize, desktop quick toggles, save failure rollback, duplicate-save guards and late completion after control teardown. Existing workspace Appearance tests run separately to check that theme controls still work.

Responsive visibility verification on 26 October 2026: `npm run test:companion`, `npm run test:appearance`, targeted ESLint, TypeScript and the isolated Next production build passed. No production database schema or notification polling behavior changed.
