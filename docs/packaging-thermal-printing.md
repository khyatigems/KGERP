# Single 50 x 25 mm packaging identity

Thermal mode prints exactly ONE label per packaging serial, in Retail and International profiles. There is no continuation page or companion label. Sticker sheet rendering, dimensions, presets and offsets remain unchanged.

## Printed fields

- Brand and full saved gemstone name, preserving natural/lab-grown/synthetic/imitation wording.
- Carat weight and package quantity.
- SKU in bold for picking and reconciliation across sales channels.
- Recorded treatment; missing information is shown as Not recorded, never guessed untreated.
- Retail: MRP inclusive of all taxes. International: recorded gemstone origin, with no domestic MRP.
- Complete packaging serial, human-readable on the same label as its verification QR.

The serial shown on paper is the same serial encoded in the QR. QR modules remain four 203 dpi printer dots with four-module quiet zones. A compact /V/[serial] public alias and uppercase URL scheme/host reduce QR density without changing the host or serial. Existing /verify/[serial] links remain valid. PDF QR graphics are embedded as lossless black/white PNGs at native 203 dpi resolution to avoid seams between vector squares. Text starts at 7 pt (7.5 pt for main identity lines) and has a 6 pt floor. Oversized retained text blocks the job; output never adds another label, truncates the name or shrinks QR modules.

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
