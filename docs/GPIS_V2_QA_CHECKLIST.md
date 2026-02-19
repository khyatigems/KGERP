# GPIS Packaging Identity Module V2 — QA Checklist (Go-Live Mandatory)

## A. Inventory Validation Tests

- Try generating a label with missing Certificate Number → must block
- Missing Weight (Carat) → must block
- Missing Weight (Grams) → must block
- Missing HSN Code → must block
- Missing GSTIN when enabled in settings → must block
- Missing MRP → must block

## B. Serial Integrity Tests

- Generate 10 labels → serials sequential within same YYMM + category
- Concurrent request test → no duplicate serial numbers
- Cancel serial → cannot be reused
- Reprint → serial unchanged
- Reprint increments reprint_count
- Reprint creates new Print Job ID and supersedes previous job

## C. Print Layout Tests (Physical Ruler Required)

- Printed label width = 100mm exactly
- Printed label height = 50mm exactly
- 2 columns align perfectly
- 5 rows align perfectly
- No overflow outside 100mm × 50mm boundary
- QR scannable
- Barcode scannable
- Watermark visible but light (3–10% recommended)

## D. Compliance Tests

- Certificate number printed
- GSTIN printed when enabled
- Registered address printed when enabled
- Made in India shown
- Tolerance printed for carat and gram
- Label version shown
- Print job ID shown
- Packing date correct

## E. Verification System Tests

- Scan QR → correct product loads
- Invalid serial → error page
- Scan count increments
- Excessive scan triggers flag (if implemented)

## F. UI & Permissions Tests

- Settings update reflects immediately in live preview
- Toggle switches hide/show correctly
- Only Admin can edit settings
- Inventory Manager (Print permission) can print but cannot change settings

## Go-Live Conditions

- All QA tests pass
- Print alignment confirmed with physical ruler on sticker sheet
- Serial duplication test passes
- Reprint superseding logic verified
- Verification page functional

