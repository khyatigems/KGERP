# Khyra implementation

Khyra's identity, default introduction and contextual help live in `lib/khyra/identity.ts`. The introduction is shown once per user on this browser; subsequent session greetings use the time of day. Navigation does not repeat it.

## Maintain the central library

Edit `modules.json`, `workflows.json` and `special-messages.json` in `lib/khyra`, then run `npm run build:khyra-library`. This validates source references and regenerates the full JSON library, dialogue reference, source coverage and lightweight live subset. Do not edit generated files directly.

The catalog contains 703 events across 47 modules. Each definition includes its trigger, evidence requirement, severity, expression, variants, variables, navigation actions, persistence policy, channels and source references. There are 98 prepared templates. Requested Shopify/Pinterest API, booking and courier events remain explicitly unconnected until a verified producer exists. Catalog coverage does not mean every event is automatically delivered.

`bindings.ts` connects exact existing saved-event identities and known feedback titles. Unknown authorized messages retain their existing content. `live.ts` ships only the definitions needed by these bindings, greetings and attention presentation; the full catalog is not imported into the global companion client.

For new integrations, render only after the producer supplies matching evidence (`started`, `success`, `failure`, `observed` or `user`). Optional `[[text {variable}]]` clauses disappear when verified variables are absent. Rendering rejects unsafe values and prepared templates in live mode. No action is exposed without an authenticated permission context. Navigation still uses existing server-authorized workflows. Rendering never executes an action, persists an event or resolves an issue.

## Four essential live poses

Khyra now uses only idle, working, success and concerned for live presentation. Business events select these poses; hovering, opening tools and inactivity do not cycle through the supplied static artwork. All 22 original assets remain available in the repository for future use, but the Style picker exposes only the four essential poses. Previewing a pose is temporary.

Appearance includes a saved horizontal flip setting. Drag Khyra directly, or use arrow keys while her button is focused. There is no separate holder. Dragging suppresses the tools click and permits placement within four pixels of the viewport bottom. Existing saved dock coordinates continue to work with the updated bounds.

The supplied thinking MP4 remains available during actual Workday loading and manual preview, respecting reduced motion and visibility.

## Speech bubble

The shared bubble includes a character portrait, Khyra identity, conversational text, category/time when available, a pointer, review action, dismissal and 15-minute companion snooze. Purple, cream and champagne styling supports dark mode. Dragged placement chooses available space, clamps to the viewport and scrolls long content. It does not take focus automatically and respects reduced motion.

The upgrade retains existing event identity, read/acknowledgement/resolution semantics, permission checks and notification backend. No additional database migration or runtime dependency is required for this Khyra library and presentation change.

## Verification

- `npm run build:khyra-library`
- `npx tsx scripts/tests/khyra-library.unit.ts`
- `npm run test:companion`
- `npm run test:notifications`
- `npx tsc --noEmit`

Browser checks use an isolated component harness with the actual supplied assets, not a signed-in production session. Local query timings are diagnostic fixture measurements, not a production performance baseline. Production deployment and monitoring remain separate.

## Deferred feedback delivery repair

Cooldown-deferred candidates now schedule one retry at the shared ledger deadline instead of waiting for an unrelated event. Deduplication and cross-tab locking remain unchanged. Eligible candidates of equal severity prefer newer timestamps. The hidden companion toast channel is active only while speech presentation is available; disabling bubbles, manual Rest or quiet hours restores native feedback presentation when the panel is closed. Opening the panel keeps managed feedback in Activity rather than displaying a duplicate native toast. The panel explains suppression settings. Browser regression covers an error received inside cooldown, its immediate concerned expression, eventual visible bubble and native fallback after disabling bubbles.

## Inventory custom-card delivery

Inventory create/update uses `operationFeedback` with explicit catalog event IDs and started/success/failure evidence. The custom card retains its original content and callbacks. A bounded in-memory metadata map provides its type and safe conversational text to the existing companion Activity stream. In-flight loading has its own immediately visible speech bubble and working pose; only the backend success branch emits completed evidence. Unknown custom cards use a visible native toaster until their producer supplies metadata. The old global CSS rule hiding every toast while Khyra was mounted has been removed; native fallbacks are positioned above the default dock.

## Activity layout repair

While Khyra's panel is open, managed feedback stays in the companion channel and is presented in Activity. Inventory operations show the conversational title/message first; the original completeness card is available in expandable details and constrained to the panel width. This avoids a separate 420px native card covering the panel. Unknown custom cards retain their native fallback.

## Active-view automatic reading and brand theme

A six-second dwell marks visible speech bubbles and Activity cards as read only while at least 60% of their content is in view, the ERP tab has focus and the user has interacted within the past minute. Blur, hidden tabs and inactivity pause delivery/expiry; away events remain unread and are presented on return. Toast expiry alone is not proof of reading. Transient feedback clears its local unread count; saved notifications use the authenticated read endpoint. Operational acknowledgement and verified resolution remain separate and are never written by this timer. Loading cards are not auto-read. The Activity action is labelled Mark as read.

The companion panel now scopes cream/purple/gold CSS tokens independently of the ERP workspace palette, including a purple dark theme matching the speech bubble.
