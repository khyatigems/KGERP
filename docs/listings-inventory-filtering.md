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

## Hidden items for marketplace shops
- The eBay and Etsy Create Marketplace Listings pickers have a Hide action per item.
- Visibility is saved in the database for the exact marketplace and connected shop, shared across users and browsers. It does not change inventory or existing listings, or affect other shops.
- Hidden items are excluded before counting and pagination. Show hidden items includes them in the filtered results with a Hidden badge and an Unhide action. Unhide an item before selecting it again.
- Hiding the currently selected item clears its draft selection. Changing shops returns to the default view with hidden items excluded.
- `POST /api/marketplace/listing-visibility` requires inventory edit permission and validates the item and connected shop.
- The additive migration creates `MarketplaceListingExclusion`; older installations also create the table safely on first use.

