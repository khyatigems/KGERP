## Scope
- Invoice PDF generation visual defects: incorrect ₹ glyph, spaced digits, misaligned numeric columns, and inconsistent font behavior across table vs totals.
- SKU label PDF visual defects: spaced digits and inconsistent number alignment in thermal/A4/tag templates.

## Symptoms Observed
- Currency values render like: `’ 1 2 , 2 3 3 . 0 1` (extra gaps between digits and punctuation).
- Rupee symbol `₹` is rendered as a wrong glyph (often a tick/apostrophe or `1`) in some outputs.
- Same invoice data can render differently between environments (browser preview vs print preview vs PDF viewer).

## Root Causes
### 1) Font coverage and encoding mismatch (₹ + digit shaping)
- jsPDF’s built-in standard fonts (Helvetica/Times/Courier) use WinAnsi encoding and do not guarantee coverage for `₹` (U+20B9).
- When a glyph is missing, PDF viewers substitute from fallback fonts or replace the glyph. This can produce “wrong symbol” and may change character metrics.
- When character metrics differ (fallback/substitution), PDF viewers can display apparent tracking/spacing artifacts (digits separated visually).

### 2) Inconsistent font application across rendering layers
- The invoice uses a mix of:
  - direct `doc.text(...)` calls
  - `jspdf-autotable` drawing for the item grid
- If the embedded font is not applied to every drawing path (table header, body, totals, and payment block), the document ends up mixing multiple fonts.
- Mixed fonts lead to inconsistent widths, right-alignment drift, and number spacing differences.

### 3) Hidden whitespace and numeric string normalization gaps
- Numeric strings may contain non-obvious Unicode whitespace (NBSP, thin spaces, BOM/ZWNBSP) depending on source and formatting.
- Even when values look correct in logs, those characters can push layout and cause visually inconsistent spacing in PDF renderers.

### 4) Character spacing defaults / plugin overrides
- Some jsPDF plugin paths (and certain PDF viewers) can apply tracking behavior that differs from `doc.text(...)`.
- If `charSpace` is not explicitly pinned to `0` for the whole document and the autoTable styles, the output can vary.

## Fix Strategy Implemented
### A) Enforce Unicode-capable font with explicit selection
- Embed a Unicode font to guarantee `₹` glyph support and consistent digit metrics.
- Prefer a font with broad Latin coverage and stable numeric metrics.
- Apply the numeric-capable font consistently for all currency values, especially inside autoTable where most spacing issues appear.

### B) Normalize numeric strings before rendering
- Remove all Unicode whitespace characters (including NBSP/thin spaces/BOM) from formatted numeric strings.
- Apply the same formatting function across invoice and labels.

### C) Lock character spacing to zero
- Set `doc.setCharSpace(0)` early.
- Ensure autoTable uses `styles.charSpace = 0`.

### D) Add validation tests for formatting
- Unit tests validate that number formatting produces:
  - no whitespace characters
  - stable separators
  - consistent decimals
- Integration coverage validates that report/label generators can be executed without runtime errors in the test harness.

## Remaining Risk / Operational Notes
- External font fetch dependency: embedded font loading is currently done via fetching TTF over HTTPS at runtime.
- If a client network blocks `fonts.gstatic.com`, the generator will fall back to built-in fonts and `₹` will not render correctly.
- Recommended mitigation: vendor the font files under `public/fonts` and load from same-origin to eliminate network variance.

