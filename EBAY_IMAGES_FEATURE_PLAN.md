# eBay Product Description Category-Specific Images Feature Plan

## Overview
Add a new settings feature to store category-specific image URLs that will be dynamically inserted into eBay HTML product descriptions, replacing the current hardcoded global banner images.

---

## 1. IMAGE ARCHITECTURE

### 1.1 Image Slots & Limits

**Recommended Configuration:**
- **Maximum images per category:** 4 (optimized for eBay descriptions without cluttering)
- **Image dimensions in HTML:** 740px width (responsive, mobile-friendly)
- **Optimal placement:** 2 banner images per description (top & middle sections)
- **Fallback:** If category images not configured, use global DEFAULT_EBAY_IMAGE_URLS (current hardcoded images)

**Why 4 images per category?**
- eBay descriptions should have 2-3 main images (header + middle section + optional footer)
- Extra slots allow rotation/seasonality
- Keep descriptions light (eBay has bandwidth considerations)
- Prevent overwhelming the description visually

### 1.2 Current Image Usage in HTML

**Current Structure:**
- **Banner 1:** Top section (after welcome message) - 740px wide
- **Banner 2:** Middle section (after product specs) - 740px wide
- **Logo:** Brand logo (72px height, centered)
- **Fallback Images:** 2 global images from `DEFAULT_EBAY_IMAGE_URLS`

**New Structure:**
```
Logo (static)
    ↓
Banner 1 (from category-specific images → fallback to global)
    ↓
Welcome Section
    ↓
Product Specs
    ↓
Banner 2 (from category-specific images → fallback to global)
    ↓
Detailed Description
    ↓
[Optional] Banner 3 (if configured for category)
    ↓
Certification & Origin blocks
    ↓
Store Policies
    ↓
Closing Note
```

---

## 2. DATABASE SCHEMA CHANGES

### 2.1 Add EbaySettings Table

**New Prisma Model:**

```prisma
model EbaySettings {
  id                     String   @id @default(uuid())
  
  // Global/default images (fallback)
  globalBannerImages     String?  // JSON array of URLs: ["url1", "url2"]
  
  // Category-specific images mapping
  categoryImageUrls      String?  // JSON object: { "Loose Gemstone": ["url1", "url2", "url3", "url4"], "Bracelet": [...] }
  
  // Settings for image display behavior
  maxImagesPerCategory   Int?     @default(4)
  imagesPerDescription   Int?     @default(2)  // How many to show per generated description (1 or 2)
  imageRotationMode      String?  @default("SEQUENTIAL")  // SEQUENTIAL, RANDOM, or FIRST
  
  // Brand/Company settings used in eBay descriptions
  brandLogoUrl           String?
  companyName            String?  @default("KhyatiGems")
  tagline                String?  @default("Precious Gems for your Precious Ones")
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  @@index([createdAt])
}
```

**Why this structure?**
- `categoryImageUrls` as JSON object allows flexible category-specific mapping
- `globalBannerImages` provides fallback when no category images exist
- `imageRotationMode` allows for future feature expansion (random images, prevent repetition)
- `imagesPerDescription` controls how many images actually appear in final HTML

---

## 3. DATA STRUCTURE FOR CATEGORY IMAGES

### 3.1 JSON Format for categoryImageUrls

```json
{
  "Loose Gemstone": [
    "https://cdn.example.com/loose-gemstone-1.jpg",
    "https://cdn.example.com/loose-gemstone-2.jpg",
    "https://cdn.example.com/loose-gemstone-3.jpg",
    "https://cdn.example.com/loose-gemstone-4.jpg"
  ],
  "Bracelet": [
    "https://cdn.example.com/bracelet-1.jpg",
    "https://cdn.example.com/bracelet-2.jpg"
  ],
  "Pendant": [
    "https://cdn.example.com/pendant-1.jpg",
    "https://cdn.example.com/pendant-2.jpg",
    "https://cdn.example.com/pendant-3.jpg"
  ],
  "Figure Idol": [
    "https://cdn.example.com/idol-1.jpg",
    "https://cdn.example.com/idol-2.jpg"
  ]
}
```

**Key Points:**
- Top-level keys are category names (exact match with Inventory.category field)
- Each category has an array of image URLs (up to 4 recommended)
- Order matters if using SEQUENTIAL mode
- Empty arrays default to global images for that category

---

## 4. UI/UX FOR SETTINGS MANAGEMENT

### 4.1 Settings Page Location
**Path:** `/settings/ebay-settings` or `/erp/settings/ebay`

**Create new page:** `app/(dashboard)/settings/ebay-settings/page.tsx`

### 4.2 Settings Form Components

**Layout:**

```
┌─────────────────────────────────────────────┐
│  eBay Product Description Settings          │
├─────────────────────────────────────────────┤
│                                             │
│  SECTION 1: Brand Information               │
│  ┌─────────────────────────────────────┐   │
│  │ Logo URL: [_______________________] │   │
│  │ Company Name: [__________________] │   │
│  │ Tagline: [_______________________] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  SECTION 2: Default/Global Images (Fallback)
│  ┌─────────────────────────────────────┐   │
│  │ Image 1: [_______________________] │   │
│  │          [Preview Thumbnail]       │   │
│  │          [Clear] [Upload]          │   │
│  │                                     │   │
│  │ Image 2: [_______________________] │   │
│  │          [Preview Thumbnail]       │   │
│  │          [Clear] [Upload]          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  SECTION 3: Category-Specific Images        │
│  ┌─────────────────────────────────────┐   │
│  │ Image Rotation: (Sequential v)      │   │
│  │ Max Images per Category: [4    v]   │   │
│  │ Images per Description: (1 o 2)    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  SECTION 4: Category Management             │
│  ┌─────────────────────────────────────┐   │
│  │  Loose Gemstone        [Edit] [+]   │   │
│  │  ├─ Image 1: [prev]                 │   │
│  │  ├─ Image 2: [prev]                 │   │
│  │  └─ Image 3: [prev]                 │   │
│  │                                     │   │
│  │  Bracelet              [Edit] [+]   │   │
│  │  ├─ Image 1: [prev]                 │   │
│  │  └─ Image 2: [prev]                 │   │
│  │                                     │   │
│  │  Pendant               [Edit] [+]   │   │
│  │  └─ (No images configured)          │   │
│  │                                     │   │
│  │  Figure Idol           [Edit] [+]   │   │
│  │  └─ (No images configured)          │   │
│  │                                     │   │
│  │  [+ Add New Category]               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Preview] [Save Settings]                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.3 Category Editor Modal

When clicking "Edit" on a category:

```
┌──────────────────────────────────────────┐
│  Edit Images: Loose Gemstone              │
├──────────────────────────────────────────┤
│                                          │
│  Image 1:                                │
│  ┌──────────────────────────────────┐   │
│  │ [Thumbnail Preview]              │   │
│  │ [_________________________URL___] │   │
│  │ [Choose File] [Paste URL] [Clear]│   │
│  └──────────────────────────────────┘   │
│                                          │
│  Image 2:                                │
│  ┌──────────────────────────────────┐   │
│  │ [Thumbnail Preview]              │   │
│  │ [_________________________URL___] │   │
│  │ [Choose File] [Paste URL] [Clear]│   │
│  └──────────────────────────────────┘   │
│                                          │
│  Image 3:                                │
│  ┌──────────────────────────────────┐   │
│  │ [Empty - Add new]                │   │
│  │ [_________________________URL___] │   │
│  │ [Choose File] [Paste URL]        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Image 4:                                │
│  ┌──────────────────────────────────┐   │
│  │ [Empty - Add new]                │   │
│  │ [_________________________URL___] │   │
│  │ [Choose File] [Paste URL]        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [Save Changes] [Cancel]                 │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. CODE IMPLEMENTATION PLAN

### 5.1 Files to Create/Modify

**New Files:**
1. `prisma/migrations/add-ebay-settings.sql` - Database migration
2. `lib/ebay-settings.ts` - Helper functions for eBay settings
3. `app/(dashboard)/settings/ebay-settings/page.tsx` - Settings page
4. `app/(dashboard)/settings/ebay-settings/ebay-settings-form.tsx` - Settings form component
5. `app/(dashboard)/settings/ebay-settings/category-image-editor.tsx` - Modal for editing category images
6. `app/settings/ebay/actions.ts` - Server actions for saving settings

**Modified Files:**
1. `lib/ebay-description.ts` - Update `buildEbayHtmlDescription()` to use dynamic images from settings
2. `components/inventory/inventory-notes.tsx` - Pass category context to `buildEbayHtmlDescription()`
3. `prisma/schema.prisma` - Add EbaySettings model

### 5.2 Key Functions to Implement

**In `lib/ebay-settings.ts`:**

```typescript
// Parse and retrieve category images
function getCategoryImages(settings: EbaySettings, category?: string): string[] {
  if (!category) return settings.globalBannerImages || DEFAULT_EBAY_IMAGE_URLS;
  
  const categoryMap = parseCategoryImageJson(settings.categoryImageUrls);
  return categoryMap[category] || settings.globalBannerImages || DEFAULT_EBAY_IMAGE_URLS;
}

// Select N images based on rotation mode
function selectImagesForDescription(
  availableImages: string[],
  count: number,
  mode: 'SEQUENTIAL' | 'RANDOM' | 'FIRST'
): string[] {
  // Implementation based on rotation mode
}

// Validate image URL (check if accessible)
async function validateImageUrl(url: string): Promise<boolean> {
  // Fetch HEAD request to check if URL is valid
}

// Parse JSON safely
function parseCategoryImageJson(json?: string | null): Record<string, string[]> {
  // Safe parsing with fallback
}
```

**In `lib/ebay-description.ts`:**

```typescript
interface BuildEbayDescriptionOptions {
  includeImages?: boolean;
  includeMeasurements?: boolean;
  includeCertificate?: boolean;
  includeOrigin?: boolean;
  categoryImages?: string[];  // NEW: Dynamic images per category
  settings?: EbaySettings;    // NEW: Settings reference for retrieval
}

export async function buildEbayHtmlDescription(
  product: EbayDescriptionFields,
  options: BuildEbayDescriptionOptions = {}
) {
  // Get images from options or fallback to DEFAULT_EBAY_IMAGE_URLS
  const images = options.categoryImages || options.settings?.globalBannerImages || DEFAULT_EBAY_IMAGE_URLS;
  
  // Use first 2 images from array
  const banner1 = images[0] || DEFAULT_EBAY_IMAGE_URLS[0];
  const banner2 = images[1] || DEFAULT_EBAY_IMAGE_URLS[1];
  
  // Rest of function uses banner1, banner2 as before
}
```

### 5.3 Server Action for Settings

**In `app/settings/ebay/actions.ts`:**

```typescript
export async function updateEbaySettings(data: {
  globalBannerImages?: string[];
  categoryImageUrls?: Record<string, string[]>;
  brandLogoUrl?: string;
  companyName?: string;
  tagline?: string;
  maxImagesPerCategory?: number;
  imagesPerDescription?: number;
  imageRotationMode?: string;
}) {
  // Validate images (check URLs)
  // Save to database
  // Revalidate cache
}

export async function getEbaySettings() {
  // Retrieve settings from database
  // Return with parsed JSON objects
}
```

---

## 6. WORKFLOW: HOW IT WORKS

### 6.1 Admin Setting Up Images

1. Admin navigates to `/settings/ebay-settings`
2. Fills in global banner images (2 images as fallback)
3. Selects rotation mode (Sequential/Random/First)
4. For each category, clicks "Edit" and adds up to 4 images:
   - Via image upload (saved to Cloudinary/ImageKit)
   - Via URL paste (for external CDN images)
5. Saves settings → saved to database
6. System validates all URLs are accessible

### 6.2 When Generating eBay Description

1. User creates/edits inventory item
2. Clicks "Generate eBay HTML Description"
3. System retrieves:
   - Product data (from form)
   - Product category (from form: "Figure Idol", "Bracelet", etc.)
4. Fetches EbaySettings from database
5. Calls `buildEbayHtmlDescription()` with:
   - Product data
   - Category-specific images (or fallback to global)
   - Rotation mode
6. HTML description generated with correct banner images
7. Description populated in textarea
8. User can preview/edit before saving

### 6.3 Fallback Logic

```
Priority 1: Category-specific images (if configured)
            ↓
Priority 2: Global default images
            ↓
Priority 3: Built-in DEFAULT_EBAY_IMAGE_URLS (current hardcoded)
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Database & Core Logic (Day 1)
- [ ] Create migration: Add EbaySettings table
- [ ] Update prisma schema
- [ ] Implement `lib/ebay-settings.ts` helper functions
- [ ] Update `lib/ebay-description.ts` to accept dynamic images

### Phase 2: Settings UI (Day 2-3)
- [ ] Create `/settings/ebay-settings` page
- [ ] Build `EbaySettingsForm` component
- [ ] Build `CategoryImageEditor` modal
- [ ] Implement file upload + URL paste
- [ ] Add image preview thumbnails

### Phase 3: Integration & Testing (Day 4)
- [ ] Update inventory form to pass category context
- [ ] Test HTML generation with dynamic images
- [ ] Add URL validation (check image accessibility)
- [ ] Test fallback logic
- [ ] Add error handling for missing images

### Phase 4: Polish & Documentation (Day 5)
- [ ] Add loading states & success messages
- [ ] Add validation UI feedback
- [ ] Write inline documentation
- [ ] Test with multiple categories
- [ ] Performance optimization (cache EbaySettings)

---

## 8. IMAGE HANDLING DETAILS

### 8.1 Image Upload Options

**Option A: External URL Paste**
- Admin provides URL directly (CDN, AWS S3, etc.)
- System validates URL accessibility
- Simple but requires external hosting

**Option B: Upload to Cloudinary/ImageKit**
- User uploads file → saved to Cloudinary
- System gets public URL from Cloudinary
- More integrated experience

**Recommended:** Support BOTH
- Paste URL field for manual CDN images
- Upload button for convenience

### 8.2 Image Validation

```typescript
async function validateImageUrl(url: string): Promise<{valid: boolean, error?: string}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return { valid: false, error: 'Image not accessible (HTTP ' + response.status + ')' };
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return { valid: false, error: 'URL is not an image' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Could not validate URL: ' + (e instanceof Error ? e.message : 'Unknown error') };
  }
}
```

### 8.3 Image Dimensions & Optimization

**Recommended Image Specs:**
- **Width:** 1440px (double the display width for retina)
- **Height:** 400-600px (maintains aspect ratio)
- **Format:** JPG (smaller) or WebP (if supported)
- **File Size:** < 500KB per image
- **Aspect Ratio:** 2.4:1 to 3:1 (wider/banner style)

**Why these specs?**
- Display width is 740px in HTML → 1440px for clarity on mobile
- Height maintains good visual without excessive whitespace
- Fits eBay's recommended dimensions for product images
- Optimized file size for faster loading

---

## 9. EXAMPLE USAGE IN HTML

### Before (Current):
```html
<img src="hardcoded-url-1.jpg" alt="KhyatiGems banner 1" ... />
<!-- Later in description -->
<img src="hardcoded-url-2.jpg" alt="KhyatiGems banner 2" ... />
```

### After (With Settings):
```html
<!-- Admin configured for "Loose Gemstone" category: 4 images -->
<!-- System selects 2 images based on rotation mode -->
<img src="loose-gemstone-banner-1.jpg" alt="KhyatiGems banner 1" ... />
<!-- Later in description -->
<img src="loose-gemstone-banner-2.jpg" alt="KhyatiGems banner 2" ... />

<!-- For "Bracelet" category with different images -->
<img src="bracelet-banner-1.jpg" alt="KhyatiGems banner 1" ... />
<img src="bracelet-banner-2.jpg" alt="KhyatiGems banner 2" ... />
```

---

## 10. MIGRATION PATH (For Existing Users)

**What happens when feature is deployed:**

1. **Existing EbaySettings table is empty** → System uses `DEFAULT_EBAY_IMAGE_URLS` (current behavior)
2. **Admin doesn't configure images** → Continues using global default images
3. **Admin configures global images** → All categories use those images
4. **Admin configures category images** → "Figure Idol" uses Idol images, "Bracelet" uses Bracelet images, etc.

**Zero breaking changes** ✓

---

## 11. FUTURE ENHANCEMENTS

1. **Image Analytics:** Track which images perform best in listings
2. **Image Rotation:** Randomly rotate category images weekly/monthly
3. **A/B Testing:** Test 2 image sets for same category
4. **Bulk Upload:** Upload multiple images at once for a category
5. **Image Cropper:** Built-in image editor to adjust crops before saving
6. **Category Templates:** Pre-built templates with images for new categories
7. **Seasonal Images:** Automatic image switching based on date/season

---

## 12. SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Max Images/Category** | 4 images |
| **Images/Description** | 2 (top & middle) |
| **Fallback** | Global default images → Built-in DEFAULT_EBAY_IMAGE_URLS |
| **Image Size** | 1440px x 400-600px (display: 740px) |
| **Storage** | JSON in EbaySettings.categoryImageUrls |
| **Upload Methods** | URL paste + File upload (Cloudinary) |
| **Rotation Modes** | Sequential, Random, First |
| **Validation** | URL accessibility check |
| **Breaking Changes** | None - fully backward compatible |
| **Data Structure** | Object: `{ "Category": ["url1", "url2", ...] }` |

---

## Implementation Checklist

- [ ] Database migration created
- [ ] Prisma schema updated
- [ ] Helper functions in `lib/ebay-settings.ts` created
- [ ] eBay description function updated to accept dynamic images
- [ ] Settings page UI created (`/settings/ebay-settings`)
- [ ] Category image editor modal created
- [ ] Server actions for CRUD operations
- [ ] Image URL validation implemented
- [ ] Inventory form updated to pass category context
- [ ] Testing with multiple categories done
- [ ] Error handling and user feedback added
- [ ] Documentation updated
- [ ] Performance optimized (caching, lazy loading)
