# Inventory marketplace preparation

Add or edit inventory and use **Marketplace listing fields** to choose each connected eBay or Etsy shop. Load the current category fields, select the category, and enter the item's actual attributes. Etsy also supports seller details, production method, tools, quantity, tags and shop section. Save the inventory form to retain these values.

Create Listing loads the selected item's saved fields for the selected shop. Category requirements still come from the marketplace: unsupported attribute choices must be reviewed before saving a draft. Prices, shipping policies and processing profiles continue through the existing listing controls.

Existing items without saved marketplace fields retain the manual listing workflow. Staff may optionally edit an older inventory item to save its fields for future reuse.

Storage uses an inventory-specific Setting key, written in the same transaction as the inventory change. This feature introduces no database migration or backfill. An omitted marketplace payload preserves existing saved values, and malformed values reject the save before inventory changes. Saved shop IDs and marketplace types are checked before writing.

For the Etsy shop named CrystalVeda, listing descriptions replace the heading “Why Buy From KhyatiGems” with “Why Buy From CrystalVeda”. Shared inventory descriptions and other shops' descriptions remain intact. This applies during preparation and draft submission.
