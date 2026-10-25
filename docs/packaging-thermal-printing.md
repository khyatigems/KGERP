# Thermal packaging identities

Thermal mode prints exactly one 50 x 25 mm label per packaging serial, in Retail and International profiles. Inventory > Actions > Print Thermal Packaging opens this format directly. Sticker-sheet dimensions and presets remain unchanged.

## Compact additions and line fitting

The saved company logo replaces repeated brand text. Before layout, the browser composites it onto white, converts it to black/white, and crops to the exact dark-content bounds. Its aspect ratio is preserved in a header up to 4.2 mm high. Preview and PDF use the same cropped image and measured geometry; the original company asset remains unchanged. If no logo is saved, the company name is used instead.

The selected manufacturing date prints as Mfg: DD/MM/YYYY. Logo and date are included when they fit alongside the other selected content and fixed-size QR; preview warnings identify any omitted addition. Full address/contact paragraphs remain off this small stock.

Thermal-specific checkboxes independently control company branding, gemstone name, weight/quantity, SKU, treatment, manufacturing date, MRP (Retail), origin (International), serial and verification QR. The chosen fields are passed to preview analysis, PDF generation and server preflight. Removed fields reserve no rows. Removing QR frees its entire column. Flowing rows are preferred; full-width footer rows below QR are used only if needed for the selected text to fit. Printing an empty selection is blocked. Unchecking manufacturing date also removes the date prompt.

Long fields reduce their own font size in 0.25 pt steps down to a 6 pt minimum before wrapping. Wrapped lines retain a consistent size and complete text. The QR and its quiet zone never shrink to make space for text. Print controls sit in a fixed dialog footer outside the scrolling options and preview, on desktop and small screens.

## Printed fields

- Brand and full saved gemstone name, preserving natural/lab-grown/synthetic/imitation wording.
- Carat weight and package quantity.
- SKU in bold for picking and reconciliation across sales channels.
- Recorded treatment; missing information is shown as Not recorded, never guessed untreated.
- Retail: MRP inclusive of all taxes. International: recorded gemstone origin, with no domestic MRP.
- Complete packaging serial, human-readable on the same label as its verification QR.

The serial shown on paper is the same serial encoded in the QR. QR modules remain four 203 dpi printer dots with four-module quiet zones. A compact /V/[serial] public alias and uppercase URL scheme/host reduce QR density without changing the host or serial. Existing /verify/[serial] links remain valid. PDF QR graphics are embedded as lossless black/white PNGs at native 203 dpi resolution to avoid seams between vector squares. Body text starts at 7 pt (7.5 pt for main identity lines); full-width footer rows, when needed, use 6 pt. All text has a 6 pt floor. Oversized retained text blocks the job; output never adds another label, truncates the name or shrinks QR modules.

Decorative graphics, repeated barcode, registered address/contact paragraphs, tax/export registration numbers, internal job/QC/location/version metadata, secondary weight units and generic boilerplate are omitted from this compact product identity. ERP data and the existing sticker output are retained. Required transaction, retail-package and destination-specific declarations must still be supplied in the applicable packaging and documents; this identity format does not certify that every legal requirement fits on this label. Gemstone origin is not a customs country-of-origin determination.

## Design references

Commercial gem-jar labels prioritize weight, reference and gemstone information:
- https://www.seattlefindings.com/Gem-Jar-Stickers_p_4465.html
- https://gemworld.com.au/products/moreInfo/340/2459/white-printed-non-adhesive-round-gem-jar-label

Gemstone identification/disclosure references:
- https://www.aglgemlab.com/gembrief
- https://www.gia.edu/doc/How_to_Read_a_GIA_Identification_Report.pdf

These references informed field priority; the thermal layout is a KhyatiGems design, not a copy or a claim of laboratory certification.

## Printing and checks

Select 50 x 25 mm stock in the printer driver; print at actual size / 100% without headers/footers or fit-to-page scaling. Open production ERP on a customer-accessible host before generating verification URLs. Inspect one physical proof and scan its QR before a batch.

Preview and PDF share measured geometry. Preview counts and PDF pages correspond one-for-one to packaging identities. Thermal jobs remain pending and cart entries retained until successful PDF generation; this records document generation, not physical printer completion. No migration is required.

Run npm run test:packaging:thermal. Render optional test PDFs with npx tsx scripts/tests/packaging-thermal.unit.ts --render-fixtures. Tests cover one-label counts, both profiles, retained text, bounds/collisions, QR geometry, readability floor, missing/invalid identity data, oversized names and unchanged sticker routing.

Run `node scripts/tests/packaging-print-dialog.ui.mjs` to verify the actual dialog with fixture-backed actions: visible/clickable Print at 1275 x 858 and 390 x 700, checkbox preview reflow, QR-column removal, and selected fields reaching the generated print PDF. The fixture does not access or mutate live ERP data.
