# ERP design alignment

Direction: calm, precise gemstone trading. Quiet neutral work surfaces; one
selected gemstone accent; actual product media and operational data carry the
color. This is a presentation pass, not a replacement of ERP workflows.

Based on Unslop by Damir Sokolovsky (@heydamir), licensed CC BY 4.0:
https://github.com/heydamir/unslop
Guidance: skills/unslop/SKILL.md and references/signs.md, tokens.md.
Credit is retained here for this adaptation.

## Scope and changes

- Shared workspace light/dark/dim ramps and sapphire/emerald/amethyst accents.
  Existing palette, surface, sidebar, density and text-size preference IDs are
  retained. Color preview values match the new palette. Screen-only overrides
  keep neutral surfaces, three text roles, visible focus and tabular figures.
- Shared cards, buttons, badges, page headers, sidebar groups, dialogs, sheets,
  empty states and notification styles. No lifting cards, colored shadows,
  gradient headings, decorative floating loops or widely tracked uppercase labels.
  Live loading/progress feedback and meaningful status colors remain.
- A real LoginShell renders the existing LoginForm, branding, configurable
  highlights and announcements. Solid surfaces and a single primary sign-in
  action replace glass/glow decorations. Unverified BIS/12K defaults are replaced
  by factual module descriptions. Administrator-configured content is retained.
- The password, existing MFA/recovery and app-lock flows are unchanged. Passkey
  sign-in stays absent. Shared app-lock dialogs retain their focus/portal handling.
- Trading and classic dashboards retain data, permissions, content sections and
  controls. Static operational titles replace greeting animation; neutral summary
  labels replace competing icon colors. Revenue gets more width than its secondary
  inventory panel. Ranked category/gem bars highlight the leading value instead
  of using a rainbow for one series.
- Inventory captions are at least 12px rather than 9/10px. Bigger headings and
  lighter figures establish hierarchy; readiness retains counts/percentages
  without duplicate mini-bars. Currency/weight columns align numerically.
  A line warning icon and explicit Missing label replace the certificate glyph.
  Mobile controls wrap rather than shrinking labels to fit a single row.
- Toast and marketplace operation feedback uses readable labels and small neutral
  shadows. Real processing feedback retains motion but transfers animate with
  transforms rather than left-position layout changes. The optional mascot is
  retained; its small notification copy is made readable.
- Website editor chrome follows workspace tokens and readable type. Actual
  customer-site previews, brand imagery, and public QR/website designs keep their
  own presentation; preview frames are content, not ERP chrome.

## Boundaries

No business records, authorization logic, API payloads, pricing/tax calculations,
saved dashboard layouts, navigation targets, print/PDF rendering templates or
production configuration are changed by this design work. Styling values in
screen-specific inventory/editor CSS change; generated invoice/label PDF
geometry remains owned by its separate rendering templates. The existing
return-to-app grace-period changes are separate work and remain intact.

## Review and validation

Representative actual presentation components are rendered with explicit
synthetic data, mocked APIs/auth callbacks, and no live user account or database.
The design fixture covers login/MFA, trading/classic/shared components, responsive
widths, light/dark/dim, stable hover, small-text readability, keyboard dialogs,
reduced motion and no horizontal overflow. Existing inventory, appearance,
notification and modal tests verify their interactions and theme contrast.
Screenshots/logs are in ignored tmp/unslop-review, tmp/theme-review,
tmp/feedback-review and tmp/passkey-checks. Inventory/modal review images in
output are generated test artifacts, not production data.

Commands:
- npx tsc --noEmit
- npm run test:design
- node scripts/tests/inventory-layout.browser.mjs
- node scripts/tests/workspace-appearance.ui.mjs
- node scripts/tests/modal-ui.browser.mjs
- node scripts/tests/erp-feedback.ui.mjs
- node scripts/tests/app-lock.ui.mjs
- npx tsx scripts/tests/app-lock.next-smoke.ts

This shared-system pass reaches authenticated ERP pages through their shared
layouts and primitives; it is not a claim that every authenticated record/state
has been manually reviewed on the live deployment. No deployment is performed.

Validation result: TypeScript and the browser/isolated Next.js checks above pass.
ESLint across changed TypeScript files reports seven existing errors: four
explicit-any errors in draggable-dashboard, one set-state-in-effect error in
bulk-action-theater, and two explicit-any errors in passkeys.integration. Each
was reproduced against its HEAD version using ESLint stdin; this pass adds no
lint errors. Existing warnings remain, including the CompanyLogo img warning.
