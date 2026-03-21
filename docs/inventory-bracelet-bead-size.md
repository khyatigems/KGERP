# Bracelet bead size (alphanumeric)

## What changed
- Inventory now supports storing an alphanumeric bead size label for elastic/flexible bracelets.
- The numeric bead size field remains for backward compatibility and analytics.

## Data fields
- `beadSizeLabel` (string): stores labels like `4mm-6mm`, `XS-L`, `A-GRADE`.
- `beadSizeMm` (number): stores a numeric value only when the label is a single size like `8mm` or `8.5mm`.

## Accepted formats
- Single size: `8mm`, `8.5mm`
- Range: `4mm-6mm`, `6mm-8mm`
- Letter sizes: `XS`, `S`, `M`, `L`, `XL`, `XS-L`
- Grades: `A-GRADE`, `AA-GRADE`, `AAA-GRADE`

## Normalization rules
- Trims whitespace
- Converts Unicode dashes to `-`
- Collapses spaces and normalizes separators
- Uppercases letters (keeps `mm`)

