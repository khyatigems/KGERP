# UI experience enhancements

This extends the calm Unslop design system with purposeful interaction feedback
and bounded rendering of large loaded collections. Business actions, permission
checks, public verification results, prices, payment eligibility, APIs, database
structure, authentication and printed labels retain their existing owners.

## Reference decisions

- [React Bits](https://github.com/DavidHDev/react-bits): evaluated Animated List
  and its keyboard selection/interaction feedback. Applied the interaction
  principles to view selection and product image navigation; no animated rows
  or decorative effects during operational scrolling. No React Bits source was
  copied or package installed.
- [Motion Primitives](https://github.com/ibelick/motion-primitives): evaluated
  Animated Background's selection feedback. A small local segmented control
  uses a sliding selected surface and native buttons. Shared tabs and dialogs
  use short opacity/transform transitions. No Motion Primitives source copied
  or additional animation runtime installed.
- [TanStack Virtual](https://github.com/TanStack/virtual): added the React
  adapter, resolved in the lockfile. Measured native table rows and a measured
  packaging batch list use stable record IDs, overscan and focus retention.
  [React adapter documentation](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual).

## Behavior

- Inventory keeps its existing 48-record server pagination, filters, card view,
  selection and actions. Table virtualization activates at 100 loaded records;
  ordinary pages retain the complete native table. The threshold also prevents
  unnecessary scrolling windows in short collections.
- Large packaging batches virtualize the visible list. Counts, label totals,
  removal, cart persistence, preview and print continue to use the full batch.
  Only one presentation tree is mounted. Rows are measured for wrapped content.
  The focused record remains mounted when the list scrolls away from it.
  On mobile the inventory and batch have separate bounded panels, and the
  search controls fit the available width instead of overflowing the page.
- The inventory view switch has a moving selected surface, pressed states,
  arrow/Home/End navigation and visible focus. Shared tabs expose tab/panel
  relationships, skip disabled tabs, and preserve mounted form values.
- Packaging verification keeps verified/preview/unmatched results distinct.
  Serial references can be copied with success/failure feedback. Product photos
  open an accessible enlargement dialog. Labels and supporting details are at
  least 12px, with compact neutral surfaces and direct support/document links.
- SKU QR pages keep branding, media, descriptions, specifications, stock,
  certificates, enquiry and payment controls. Copyable SKU references and local
  section navigation improve scanning. Real payment behavior is unchanged.
- Gallery arrow/Home/End navigation pauses automatic rotation. Rotation also
  pauses while keyboard focus, pointer interaction, zoom or page visibility
  requires it. Thumbnail navigation scrolls only the strip, never the whole page.
  Reduced-motion preferences disable automatic rotation and entrance animation.
- Buttons, dialogs, and tab panels retain immediate interaction. Motion is
  opacity/transform based, normally 140–180ms, and disabled for reduced motion.

## Validation

`npm run test:experience` renders the actual components against synthetic data,
local assets and isolated auth/action substitutes. It exercises 1,200-record
collections, bounded mounted rows, end-of-list reachability, full-dataset
selection, filters, empty results, retained focus, batch removal/totals,
keyboard controls, public verification states, copy feedback, image/certificate
dialogs, gallery navigation and reduced motion at mobile/desktop sizes.
Screenshots are generated under ignored `tmp/experience-review`.

Existing responsive inventory, modal, packaging print and app-lock checks are
also relevant regressions. No live account, production write or deployment is
needed for these checks. The public-facing design changes apply only to the
verification/product presentation components; label/PDF rendering is untouched.

Validation completed:

- TypeScript `--noEmit` and targeted ESLint: passed.
- Experience browser harness: passed, including the actual packaging wizard
  at 390/1440px and public QR pages at 320/390/1440px in light/dark.
- Existing inventory browser harness: passed at 320/390/768/1024/1440px.
- Shared modal harness: passed in light/dark, desktop/mobile, with focus trapping.
- Packaging print harness: passed; selected fields still reach the PDF output.
- App-lock harness: passed, including filter focus and one-minute background grace.

No production performance benchmark is claimed: normal inventory pagination
already bounds loaded records. The 1,200-record tests verify mounted DOM size
and complete-data interactions, not database/query speed. Browser find and
screen-reader exploration of virtualized collections are limited to mounted
rows; existing filtering and pagination remain the primary record navigation.
