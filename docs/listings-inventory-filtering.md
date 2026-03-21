# Create Listing inventory filtering

## What changed
- The Create Listing inventory selector is now a searchable, paginated picker instead of a long dropdown.

## Filters
- Search text (SKU/name/notes)
- Category, Gem Type, Color, Status
- Price range
- Created date range
- Sorting (newest, oldest, SKU, name, price)
- Page size: 10 / 25 / 50 / 100

## Presets
- Filter presets are saved in the browser (local storage).

## API
- `GET /api/inventory/search` returns filtered inventory for selection.

