# eBay Images Feature - Quick Reference Guide

## 📊 KEY DECISIONS

### How Many Images Can Be Added?
- **Per Category:** 4 images maximum (recommended)
- **In HTML Description:** 2 images (top banner + middle banner)
- **Extra images:** Can be rotated or kept as alternatives

### How Will Multiple Images Be Shown?
Three rotation modes available:

```
MODE 1: SEQUENTIAL
├─ First generation: Use Image 1 & 2
├─ Second generation: Use Image 2 & 3
├─ Third generation: Use Image 3 & 4
└─ Prevents repetition in listings

MODE 2: RANDOM
├─ Each generation: Pick 2 random images from the 4
└─ Maximum visual variety

MODE 3: FIRST
├─ Always use Image 1 & 2
└─ Most consistent branding
```

### Image Placement in HTML

```
┌─────────────────────────────────────┐
│  Logo: KhyatiGems (Static)          │  ← Fixed brand logo
├─────────────────────────────────────┤
│                                     │
│  BANNER IMAGE 1                     │  ← From category or global
│  (After welcome message)            │     settings
│                                     │
├─────────────────────────────────────┤
│  Welcome Section                    │
│  Product Specifications             │
│  Product Summary                    │
├─────────────────────────────────────┤
│                                     │
│  BANNER IMAGE 2                     │  ← From category or global
│  (Before detailed description)      │     settings
│                                     │
├─────────────────────────────────────┤
│  Detailed Description               │
│  Product Notes                      │
│  Specs Table                        │
│  Certification Block                │
│  Origin Block                       │
│  Store Policies                     │
│  Closing Note                       │
└─────────────────────────────────────┘
```

---

## 🏗️ SYSTEM ARCHITECTURE

### Data Flow

```
SETTINGS PAGE
    ↓
Admin adds/edits images for each category
    ↓
    ┌─────────────────────────────────┐
    │  EbaySettings Database Table    │
    │  ┌────────────────────────────┐ │
    │  │ categoryImageUrls:         │ │
    │  │ {                          │ │
    │  │   "Loose Gemstone": [...], │ │
    │  │   "Figure Idol": [...],    │ │
    │  │   "Bracelet": [...]        │ │
    │  │ }                          │ │
    │  └────────────────────────────┘ │
    └─────────────────────────────────┘
    ↓
INVENTORY FORM
    ↓
User selects category & clicks "Generate eBay Description"
    ↓
    ┌─────────────────────────────────┐
    │  buildEbayHtmlDescription()     │
    │  (with category-specific images)│
    └─────────────────────────────────┘
    ↓
HTML Description generated with correct images for that category
    ↓
Populated in textarea for user to copy/paste to eBay
```

---

## 📋 FEATURE SPECIFICATIONS

### Image Limits

| Aspect | Value | Reason |
|--------|-------|--------|
| **Max images per category** | 4 | eBay bandwidth + visual clarity |
| **Images shown per listing** | 2 | Top + middle sections |
| **Image width in HTML** | 740px | Mobile responsive |
| **Image source size** | 1440px | Retina display clarity |
| **Image aspect ratio** | 2.4:1 to 3:1 | Banner/landscape format |
| **Categories supported** | All | Based on Inventory.category field |

### Where Images Come From (Priority Order)

```
Category has images configured?
    ├─ YES → Use category-specific images ✓
    │
    └─ NO → Use global default images
         │
         └─ Global images configured?
              ├─ YES → Use them ✓
              │
              └─ NO → Use built-in DEFAULT_EBAY_IMAGE_URLS ✓
```

---

## 🎯 USAGE EXAMPLE

### Scenario: Figure Idol Category

**Admin Setup:**
```
Admin goes to Settings > eBay Settings
Finds category: "Figure Idol"
Adds 4 images:
  - idol-banner-1.jpg (temple idol aesthetic)
  - idol-banner-2.jpg (deity in nature)
  - idol-banner-3.jpg (spiritual elements)
  - idol-banner-4.jpg (cultural significance)
Saves with mode: "SEQUENTIAL"
```

**User Generates Description:**
```
User creates inventory:
  - Item Name: "Krishna Idol"
  - Category: "Figure Idol"
  - Gem Type: Ruby
  - Weight: 15 cts
Clicks: "Generate eBay HTML Description"

System retrieves:
  - Product info
  - Category: "Figure Idol"
  - Settings: EbaySettings.categoryImageUrls["Figure Idol"]

HTML Generated with:
  - Banner 1: idol-banner-1.jpg (not loose-gemstone-banner.jpg)
  - Banner 2: idol-banner-2.jpg
  - All other content same structure
```

**Result:**
- Krishna Idol has images with spiritual/deity aesthetic ✓
- Not generic gemstone images ✓
- Consistent branding for category ✓

---

## 💾 DATABASE SCHEMA

### EbaySettings Table

```sql
CREATE TABLE EbaySettings (
  id                    UUID PRIMARY KEY,
  
  globalBannerImages    JSON,      -- ["url1", "url2"] (fallback)
  categoryImageUrls     JSON,      -- {"Category": ["url1", ...], ...}
  
  maxImagesPerCategory  INT,       -- Default: 4
  imagesPerDescription  INT,       -- Default: 2
  imageRotationMode     VARCHAR,   -- SEQUENTIAL, RANDOM, FIRST
  
  brandLogoUrl          VARCHAR,
  companyName           VARCHAR,
  tagline               VARCHAR,
  
  createdAt             TIMESTAMP,
  updatedAt             TIMESTAMP
);
```

### categoryImageUrls JSON Structure

```json
{
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
```

---

## ⚙️ CONFIGURATION OPTIONS

### Image Rotation Modes

#### 1. SEQUENTIAL Mode
```
First item created: Shows Image[1] & Image[2]
Second item created: Shows Image[2] & Image[3]
Third item created: Shows Image[3] & Image[4]
Fourth item created: Wraps back to Image[1] & Image[2]

✓ Pros:
  - Prevents same images repeated in quick listings
  - Natural progression
  
✗ Cons:
  - Needs tracking of last used position
```

#### 2. RANDOM Mode
```
First item created: Randomly picks 2 from 4 images
Second item created: Randomly picks 2 from 4 images (might be same)
Third item created: Randomly picks 2 from 4 images

✓ Pros:
  - Maximum variety in appearance
  - No complex state management
  
✗ Cons:
  - Might show same images repeatedly
```

#### 3. FIRST Mode
```
Every item created: Always shows Image[1] & Image[2]

✓ Pros:
  - Maximum consistency
  - Predictable branding
  
✗ Cons:
  - No variety in appearance
  - Other images never used
```

---

## 🔄 BACKWARD COMPATIBILITY

```
Current State (No Changes):
├─ EbaySettings doesn't exist yet
├─ ALL descriptions use DEFAULT_EBAY_IMAGE_URLS
└─ No disruption to existing functionality

After Feature Deployed:
├─ EbaySettings table created (empty)
├─ If admin does NOTHING:
│  └─ System still uses DEFAULT_EBAY_IMAGE_URLS ✓
├─ If admin configures global images:
│  └─ All categories use those images ✓
└─ If admin configures per-category images:
   └─ Each category gets its own images ✓

✓ Zero Breaking Changes
✓ Fully Backward Compatible
✓ Gradual Rollout Possible
```

---

## 🚀 IMPLEMENTATION TIMELINE

```
Day 1 (Database)
├─ Create migration
├─ Add EbaySettings model to Prisma
└─ Create helper functions

Day 2-3 (UI)
├─ Create settings page
├─ Build form component
├─ Add category editor modal
└─ Implement upload + paste options

Day 4 (Integration)
├─ Update inventory form
├─ Integrate with description generator
├─ Add validation & error handling
└─ Test with multiple categories

Day 5 (Polish)
├─ Add loading states
├─ Improve UX/feedback
├─ Performance optimization
└─ Documentation
```

---

## 📱 UI COMPONENTS NEEDED

1. **EbaySettingsPage** (`/settings/ebay-settings`)
   - Display all settings sections
   - Show all categories with their images

2. **EbaySettingsForm**
   - Global images section
   - Rotation mode selector
   - Images per description setting

3. **CategoryImageEditor** (Modal)
   - 4 image slots per category
   - URL paste + file upload
   - Image preview thumbnails
   - Delete/clear button

4. **ImageUploadField**
   - Upload to Cloudinary
   - Or paste URL
   - Shows preview thumbnail
   - Validate URL accessibility

---

## ✨ SUMMARY

| Question | Answer |
|----------|--------|
| **How many images per category?** | 4 maximum (recommended) |
| **How many shown per description?** | 2 (top & middle banners) |
| **How to handle multiple images?** | 3 modes: Sequential, Random, or First |
| **Where do they appear?** | 2 locations in HTML (top + middle) |
| **What if category has no images?** | Fallback to global or built-in defaults |
| **Can users configure this?** | Yes, through Settings UI |
| **Is it backward compatible?** | 100% - zero breaking changes |
| **Can multiple categories have different images?** | Yes, each category can have unique set |
| **What image formats supported?** | JPG, PNG, WebP (any URL-accessible image) |
| **File size limits?** | Recommended < 500KB per image |

---

## 🎨 Visual Preview

### For Loose Gemstone Category:
```html
<img src="https://cdn/loose-gemstone-1.jpg" />  ← Generic gemstone imagery
<img src="https://cdn/loose-gemstone-2.jpg" />
```

### For Figure Idol Category:
```html
<img src="https://cdn/idol-spiritual-1.jpg" />  ← Spiritual, deity imagery
<img src="https://cdn/idol-deity-2.jpg" />
```

### For Bracelet Category:
```html
<img src="https://cdn/bracelet-wrist-1.jpg" />  ← Wrist, jewelry imagery
<img src="https://cdn/bracelet-style-2.jpg" />
```

Each category gets visually appropriate images that enhance the product presentation!
