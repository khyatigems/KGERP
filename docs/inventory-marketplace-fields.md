# Shared inventory product details

The inventory form stores one set of product facts per item, independent of marketplace shops. Every shop reuses these facts. Existing gemstone, primary color, shape, weight, treatment, origin/locality, transparency and measurement inputs remain the source; Product details contains only missing attributes.

Sales category IDs remain separate for eBay and Etsy because their taxonomies differ. Country of origin differs from the existing origin/locality (which may be a mine or region). Shop sections, shipping/processing policies, prices and publication confirmation remain shop-specific listing controls.

## Category audit

The maintenance script snapshot-inventory-field-catalog.ts fetched the connected marketplaces' taxonomy APIs on 11 October 2026. The bundled catalog covers the product families currently supported by Create Listing:

- eBay Loose Gemstones: 1 required and 23 optional aspects.
- eBay Fashion Jewelry / Bracelets & Charms: 3 required and 43 optional aspects.
- Etsy Gemstones, Beads, Beaded Bracelets and Charm Bracelets: 21, 18, 23 and 24 properties respectively.

The inventory form uses this catalog without marketplace requests or shop selectors. Duplicate meanings map to one input; current taxonomy validates values during listing preparation. Marketplace changes can still require review. API definitions: [eBay item specifics](https://developer.ebay.com/api-docs/user-guides/static/trading-user-guide/item-specifics-requirements.html) and [Etsy listing properties](https://developers.etsy.com/documentation/tutorials/listings/).

## Dimensions and compatibility

Length, width and breadth/depth use separate dropdowns in millimetres. Presets cover 0.1–200 mm; exact-size entry supports finer precision and larger measurements. Old precise measurements remain selectable. Order is L × W × B; values are never sorted or swapped. eBay Item Length, Item Width and Item Depth map separately.

Shared facts use inventory_product_facts_v1_<inventoryId> in Setting and save atomically with inventory. Existing dimensionsMm text remains compatible with descriptions, exports and existing screens. Listing preparation also parses that text, so bulk dimension edits take precedence over older snapshots. No migration is needed.

The authorized backfill added structured dimensions to 229 existing items, left 17 ambiguous values untouched, and preserved the original Inventory columns. A second dry run found zero remaining safe candidates. The recovery snapshot is in the git-ignored backups/inventory-dimensions/ directory. The backfill refuses to overwrite changed items or existing structured dimensions.

## Hidden fields and old items

Certificates, Rashis, stock status, additional notes and certificate comments are hidden in this form. Saving omits these fields and preserves stored values and relations. Certificates and stock status remain managed through inventory-table actions. The completeness checklist is collapsed by default, with its count visible.

Old items can use manual listing entry, or staff can edit Product details for future reuse. Previous shop-specific preparation settings remain compatibility fallbacks; this form no longer creates them.

CrystalVeda branding remains limited to that Etsy shop's description heading. Common inventory descriptions and other shops remain intact.
