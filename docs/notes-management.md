# Notes management

`/notes` and the Business Overview Quick Notes widget use the same `/api/dashboard/notes` endpoint, original `DashboardNote` records and SWR key. Notes are shared with the signed-in ERP team, matching the original widget. New notes record the actual signed-in author. No historical content is rewritten or moved.

## Workflows

- Search titles, full content, tags and categories. Filter by category, pinned, favourites, prompts/templates, archive or trash. Sort by creation/update time, title or usage.
- Changes save after 800 ms of inactivity. Failed saves retain the editor draft for retry. Version checks prevent overwriting changes made elsewhere. Clean open editors refresh when the shared data changes. The widget and workspace share cache updates; other tabs/sessions revalidate every 15 seconds and on focus.
- Prompt and template notes support `{{variable}}` placeholders. Fill the generated fields and copy a personalised prompt without changing the master. Duplicate any note to build a variant.
- Copy complete content or an editor selection. TXT and DOCX download directly. PDF uses browser Print / Save as PDF for Unicode support.
- Add up to five attachments: PNG, JPEG, WEBP, GIF, PDF, TXT, DOCX, XLSX or CSV; each file is limited to 2 MB, combined encoded attachment data to 3 MB. Attachments stay in the existing database and load only when a note is opened. They are excluded from public links and email.
- Public links are opt-in, read-only, unguessable and revocable. Archive hides shared content while archived. Moving to Trash revokes the token. Trash and archive are reversible; there is no permanent-delete action.
- Email uses the existing email service and queue. Submission is distinct from confirmed delivery, which remains visible in the Communication Center.
- Notes opens as a searchable card library with an optional compact list view. Pinned notes stay at the top. Copy, favourite, pin, archive and restore are available directly on the cards. Opening a note switches to a focused document editor; Back to notes preserves the library filters and layout. New notes and prompts are created from this page or the existing Business Overview widget. There is no global floating button or capture shortcut.

## Data and rollout

The additive migration `20261031090000_notes_knowledge` creates `NoteDetails`, keyed by the original note ID, for organisation, sharing and attachment metadata. Existing records without metadata read as active General notes. The idempotent runtime schema ensure supports the ERP's existing deployment pattern. No separate notes database or duplicated note content is introduced. Production data is not modified by the tests.

Notes routes require server-side authentication; mutations respect ERP Freeze Mode. Public-link reads return only title and content, use no-store/noindex headers and escape all HTML. Autosave, archive and restore update the original record's update timestamp. Future retrieval or AI search can index this same canonical content; AI retrieval is not part of this implementation.

## Validation

`npm run test:notes` runs isolated SQLite integration checks and a browser harness that renders the actual library, focused editor and dashboard widget components. It checks legacy content preservation, author attribution, authentication, optimistic concurrency, attachments, share revocation, soft deletion, restore, freeze enforcement, two-way dashboard/workspace updates, autosave retry, template substitution, library search/layouts, direct card actions and responsive light/dim/dark rendering. Browser screenshots are written to `tmp/notes-review`.
