# eBay Images Feature - Visual Architecture Diagram

## System Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN SETTINGS PAGE                             │
│                    (/settings/ebay-settings)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Global Settings (Fallback)           Category-Specific Settings       │
│  ┌──────────────────────────────┐    ┌─────────────────────────────┐  │
│  │ Banner Image 1:  [___URL___] │    │ Loose Gemstone              │  │
│  │                  [Preview]   │    │ ├─ Image 1: [Preview]       │  │
│  │                              │    │ ├─ Image 2: [Preview]       │  │
│  │ Banner Image 2:  [___URL___] │    │ ├─ Image 3: [Preview]       │  │
│  │                  [Preview]   │    │ └─ Image 4: [Preview]       │  │
│  │                              │    │                             │  │
│  │ Logo URL:        [___URL___] │    │ Figure Idol                 │  │
│  │                              │    │ ├─ Image 1: [Preview]       │  │
│  │ Mode: [Sequential v]         │    │ └─ Image 2: [Preview]       │  │
│  │                              │    │                             │  │
│  │ Max per category: [4    v]   │    │ Bracelet                    │  │
│  │                              │    │ ├─ Image 1: [Preview]       │  │
│  └──────────────────────────────┘    │ ├─ Image 2: [Preview]       │  │
│                                       │ └─ Image 3: [Preview]       │  │
│                                       └─────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ SAVE
                    ┌───────────────────────────────┐
                    │   EbaySettings Database       │
                    │   (JSON categoryImageUrls)    │
                    └───────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    INVENTORY FORM (Create/Edit)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Item Name:        [______________________________]                    │
│  Category:         [Loose Gemstone v]  ← USER SELECTS CATEGORY       │
│  Gem Type:         [Ruby             v]                               │
│  Weight:           [15               ]                                │
│                                                                         │
│  [Generate eBay HTML Description] ← USER CLICKS BUTTON               │
│                                                                         │
│  Result: eBay HTML Description                                        │
│  ┌─────────────────────────────────────────────────────┐             │
│  │ <html>                                              │             │
│  │   ... (header, logo, welcome text) ...             │             │
│  │                                                     │             │
│  │   <img src="loose-gemstone-1.jpg" /> ← CATEGORY    │             │
│  │                                     IMAGES USED    │             │
│  │   ... (product specs) ...                          │             │
│  │                                                     │             │
│  │   <img src="loose-gemstone-2.jpg" /> ← CATEGORY    │             │
│  │                                     IMAGES USED    │             │
│  │   ... (description, policies) ...                  │             │
│  │ </html>                                             │             │
│  └─────────────────────────────────────────────────────┘             │
│                                                                         │
│  [Copy to eBay Listing]                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Image Selection Logic

```
User clicks "Generate eBay Description"
      ↓
System retrieves:
  ├─ Product data (name, weight, etc.)
  ├─ Category from form (e.g., "Figure Idol")
  └─ EbaySettings from database
      ↓
Query: Does "Figure Idol" have images configured?
      ↓
   ┌──YES──────────────┬──NO──────────────┐
   ↓                   ↓
Use category images   Are global images configured?
e.g., 4 images       ↙                    ↘
   │              YES                    NO
   │               ↓                      ↓
   │          Use global images      Use DEFAULT_
   │          e.g., 2 images         EBAY_IMAGE_
   │               ↓                 URLS (hardcoded)
   │               ↓                  ↓
   └───────────────┴──────────────────┘
            ↓
    Select images based on rotation mode:
    
    SEQUENTIAL: Image 1 & 2 → Next time: 2 & 3
    RANDOM:     Random 2 from 4
    FIRST:      Always Image 1 & 2
            ↓
    HTML generated with selected images
            ↓
    Return to user for copy/paste
```

---

## Database Schema Relationship

```
┌─────────────────────────────────────────┐
│          EbaySettings Table             │
├─────────────────────────────────────────┤
│ id                  | UUID              │
│ globalBannerImages  | JSON              │
│ categoryImageUrls   | JSON              │
│ imageRotationMode   | VARCHAR           │
│ maxImagesPerCategory| INT               │
│ brandLogoUrl        | VARCHAR           │
│ createdAt           | TIMESTAMP         │
│ updatedAt           | TIMESTAMP         │
└─────────────────────────────────────────┘

                   JSON Structure:

categoryImageUrls = {
  "Loose Gemstone": [
    "https://cdn.example.com/lg-1.jpg",
    "https://cdn.example.com/lg-2.jpg",
    "https://cdn.example.com/lg-3.jpg",
    "https://cdn.example.com/lg-4.jpg"
  ],
  "Figure Idol": [
    "https://cdn.example.com/idol-1.jpg",
    "https://cdn.example.com/idol-2.jpg"
  ],
  "Bracelet": [
    "https://cdn.example.com/bracelet-1.jpg",
    "https://cdn.example.com/bracelet-2.jpg",
    "https://cdn.example.com/bracelet-3.jpg"
  ]
}

globalBannerImages = [
  "https://cdn.example.com/default-1.jpg",
  "https://cdn.example.com/default-2.jpg"
]
```

---

## HTML Output Comparison

### BEFORE (Current - All Categories Same)

```html
<div>
  <img src="https://unsplash.com/hardcoded-1.jpg" />
  <!-- This is the SAME for all products, regardless of category -->
  ... product content ...
  <img src="https://unsplash.com/hardcoded-2.jpg" />
  <!-- Again, SAME for all products -->
</div>
```

**Problem:** Figure Idol products show generic gemstone images ❌

---

### AFTER (New Feature - Category-Specific)

#### Figure Idol Product:
```html
<div>
  <img src="https://cdn.example.com/idol-spiritual-1.jpg" />
  <!-- Spiritual/deity imagery relevant to Figure Idol -->
  ... product content ...
  <img src="https://cdn.example.com/idol-temple-2.jpg" />
  <!-- Temple/cultural imagery for Figure Idol -->
</div>
```

#### Bracelet Product:
```html
<div>
  <img src="https://cdn.example.com/bracelet-wrist-1.jpg" />
  <!-- Wrist/jewelry imagery for Bracelet -->
  ... product content ...
  <img src="https://cdn.example.com/bracelet-style-2.jpg" />
  <!-- Fashion/style imagery for Bracelet -->
</div>
```

#### Loose Gemstone Product:
```html
<div>
  <img src="https://cdn.example.com/loose-1.jpg" />
  <!-- Loose stone photography for Loose Gemstone -->
  ... product content ...
  <img src="https://cdn.example.com/loose-2.jpg" />
  <!-- Close-up stone photography -->
</div>
```

**Solution:** Each category gets visually appropriate, relevant images ✓

---

## Image Placement in Description Template

```
┌───────────────────────────────────────┐
│         KhyatiGems Logo               │  (Static - always same)
├───────────────────────────────────────┤
│     Welcome to KhyatiGems             │  (Static text)
└───────────────────────────────────────┘

         ↓ DYNAMIC IMAGE 1 ↓

┌───────────────────────────────────────┐
│    🌟 Product Specifications 🌟       │
│                                       │
│  Product Type: [from product data]   │
│  Weight: [from product data]         │
│  Color: [from product data]          │
│  etc...                              │
└───────────────────────────────────────┘

         ↓ DYNAMIC IMAGE 2 ↓

┌───────────────────────────────────────┐
│    🔍 Detailed Description 🔍         │
│                                       │
│  This stunning [item name] offers... │
│  [full descriptive text]             │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│  📜 Certification  🌍 Origin & Treat. │
│  🛡️ Store Policies  🛍️ Closing Note   │
└───────────────────────────────────────┘
```

**Note:** The 2 DYNAMIC IMAGES (marked above) change based on category configuration

---

## Settings UI Flow

```
Admin visits: /settings/ebay-settings
      ↓
┌─────────────────────────────────────┐
│ See all configured categories       │
│                                     │
│ ☐ Loose Gemstone       [Edit][+]    │
│ ☐ Figure Idol          [Edit][+]    │
│ ☐ Bracelet             [Edit][+]    │
│ ☐ Pendant              [Edit][+]    │
│                                     │
│ [+ Add New Category]                │
└─────────────────────────────────────┘
      ↓
Admin clicks [Edit] on "Figure Idol"
      ↓
┌──────────────────────────────────────┐
│  MODAL: Edit Figure Idol Images      │
├──────────────────────────────────────┤
│                                      │
│  Image 1:                            │
│  ┌────────────────────────────────┐  │
│  │ [Thumbnail: idol-1.jpg]        │  │
│  │ [_____________________URL____] │  │
│  │ [File] [Paste] [Delete]        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Image 2:                            │
│  ┌────────────────────────────────┐  │
│  │ [Thumbnail: idol-2.jpg]        │  │
│  │ [_____________________URL____] │  │
│  │ [File] [Paste] [Delete]        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Image 3: [Empty]                    │
│  ┌────────────────────────────────┐  │
│  │ [Add new image]                │  │
│  │ [_____________________URL____] │  │
│  │ [File] [Paste]                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  Image 4: [Empty]                    │
│  ┌────────────────────────────────┐  │
│  │ [Add new image]                │  │
│  │ [_____________________URL____] │  │
│  │ [File] [Paste]                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Save] [Cancel]                     │
│                                      │
└──────────────────────────────────────┘
      ↓
Admin saves
      ↓
Settings updated in database
      ↓
Next time a "Figure Idol" description is generated,
it will use these 2 images in the HTML ✓
```

---

## Rotation Mode Examples

### Scenario: Admin has 4 images for "Bracelet" category

**SEQUENTIAL Mode:**
```
Listing 1: Shows Image 1 & 2
Listing 2: Shows Image 2 & 3
Listing 3: Shows Image 3 & 4
Listing 4: Shows Image 4 & 1
Listing 5: Shows Image 1 & 2 (wraps around)
```

**RANDOM Mode:**
```
Listing 1: Shows Image 2 & 4 (random)
Listing 2: Shows Image 1 & 3 (random)
Listing 3: Shows Image 2 & 4 (random - could be same as Listing 1)
Listing 4: Shows Image 1 & 2 (random)
Listing 5: Shows Image 3 & 4 (random)
```

**FIRST Mode:**
```
Listing 1: Shows Image 1 & 2
Listing 2: Shows Image 1 & 2 (always same)
Listing 3: Shows Image 1 & 2 (always same)
Listing 4: Shows Image 1 & 2 (always same)
Listing 5: Shows Image 1 & 2 (always same)
```

---

## File Structure for Implementation

```
d:/khyatigems-erp/
├── EBAY_IMAGES_FEATURE_PLAN.md (comprehensive plan)
├── EBAY_IMAGES_QUICK_REFERENCE.md (quick summary)
├── EBAY_IMAGES_ARCHITECTURE.md (this file)
├── prisma/
│   ├── schema.prisma (ADD: EbaySettings model)
│   └── migrations/
│       └── add_ebay_settings.sql (NEW)
├── lib/
│   ├── ebay-settings.ts (NEW)
│   └── ebay-description.ts (MODIFY)
├── app/
│   └── (dashboard)/
│       └── settings/
│           └── ebay-settings/ (NEW)
│               ├── page.tsx
│               ├── ebay-settings-form.tsx
│               └── category-image-editor.tsx
├── app/
│   └── settings/
│       └── ebay/
│           └── actions.ts (NEW)
└── components/
    └── inventory/
        └── inventory-notes.tsx (MODIFY)
```

---

## API Endpoints Needed

```
GET  /api/settings/ebay              → Retrieve EbaySettings
POST /api/settings/ebay              → Save EbaySettings

GET  /api/settings/ebay/categories   → Get all configured categories
POST /api/settings/ebay/categories   → Add new category
PUT  /api/settings/ebay/categories/:name → Update category images
DELETE /api/settings/ebay/categories/:name → Delete category

GET  /api/image/validate             → Validate image URL
     (query param: url=...)
```

---

## Summary Table with Real Examples

| Category | Image 1 | Image 2 | Image 3 | Image 4 | Used in HTML |
|----------|---------|---------|---------|---------|-------------|
| **Loose Gemstone** | loose-1.jpg | loose-2.jpg | loose-3.jpg | loose-4.jpg | loose-1 & loose-2 |
| **Figure Idol** | idol-1.jpg | idol-2.jpg | — | — | idol-1 & idol-2 |
| **Bracelet** | bracelet-1.jpg | bracelet-2.jpg | bracelet-3.jpg | — | bracelet-1 & bracelet-2 |
| **Pendant** | (not configured) | (not configured) | (not configured) | (not configured) | global-1 & global-2 |
| **Global Fallback** | default-1.jpg | default-2.jpg | — | — | Used when category not configured |

---

## State Management Flow

```
ADMIN ACTIONS:
├─ Updates global images          → Save to DB → Invalidate cache
├─ Adds category images           → Save to DB → Invalidate cache
├─ Changes rotation mode          → Save to DB → No cache needed
└─ Deletes category               → Save to DB → Invalidate cache

USER ACTIONS:
├─ Fills inventory form           → Form state only
├─ Selects category              → Form state only
├─ Clicks "Generate Description" 
│  └─ Query: GET /api/settings/ebay?category=FormValue
│      ↓
│      Return: { categoryImages: [...], mode: "SEQUENTIAL", ... }
│      ↓
│      Generate HTML with those images
│      ↓
│      Show in textarea ✓
└─ Copies to eBay listing
```

---

## Error Handling Scenarios

```
Scenario 1: Image URL is broken
├─ Detection: Validation on save (HEAD request)
├─ Message: "⚠️ This image URL is not accessible. Please check."
└─ Action: User must fix URL before saving

Scenario 2: Category deleted from Inventory (but images still configured)
├─ Behavior: Images remain in settings (no auto-cleanup)
├─ Impact: Zero - the settings just won't be used
└─ Action: Admin can manually delete unused category

Scenario 3: User generates description for category with no images
├─ Behavior: Fallback to global images
├─ Impact: Description still generated successfully
└─ Result: User gets default branding images instead

Scenario 4: Admin uploads very large image
├─ Detection: Check file size before upload
├─ Message: "⚠️ Image must be < 500KB. Your image is 2MB."
└─ Action: User must compress/resize image first

Scenario 5: Invalid JSON in categoryImageUrls (data corruption)
├─ Detection: Safe parsing with try-catch
├─ Behavior: Fallback to empty object {}
├─ Impact: Treats all categories as "not configured"
└─ Result: All descriptions use global images
```

---

This architecture ensures:
- ✅ Smooth user experience
- ✅ Category-specific branding
- ✅ Easy fallback mechanism
- ✅ Flexible image management
- ✅ Zero breaking changes
- ✅ Scalable design for future features
