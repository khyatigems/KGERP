# Animation Asset Manifest

**All assets licensed under Lottie Simple License** — Free for commercial use, no attribution required.

## Download Instructions
1. Visit each source URL
2. Click "Download" → Choose "dotLottie (.lottie)" format
3. Save to corresponding path below
4. Replace placeholder `.json` files

---

## Loading Animations

### `global-loader.lottie`
- **Source**: https://lottiefiles.com/free-animations/gem → "Diamond Rotate" (Gemstone Details Pack)
- **Path**: `public/animations/loading/global-loader.lottie`
- **Size**: ~12KB
- **Use**: Fullscreen app loader
- **Premium Only**: ✅
- **Segments**: 0-100% (progress mapped to frame range)

### `dashboard-loader.lottie`
- **Source**: https://lottiefiles.com/free-animations/dashboard → "Data Load" (Dashboard Animation Pack)
- **Path**: `public/animations/loading/dashboard-loader.lottie`
- **Size**: ~15KB
- **Use**: Dashboard initial load
- **Premium Only**: ✅

### `widget-loader.lottie`
- **Source**: https://lottiefiles.com/free-animation/sparkles-loop-loader-mJIacMF4XW
- **Path**: `public/animations/loading/widget-loader.lottie`
- **Size**: ~8KB
- **Use**: Widget skeletons
- **Premium Only**: ✅
- **Loop**: ✅

### `export-loader.lottie`
- **Source**: https://lottiefiles.com/free-animation/gold-loading-fO7jH7ab6Q
- **Path**: `public/animations/loading/export-loader.lottie`
- **Size**: ~18KB
- **Use**: Export/packaging progress
- **Premium Only**: ✅
- **Loop**: ✅

---

## Sidebar Animations

### `sidebar-collapse.lottie`
- **Source**: https://lottiefiles.com/free-animations/hamburger-menu → "Smooth Collapse"
- **Path**: `public/animations/sidebar/sidebar-collapse.lottie`
- **Size**: ~10KB
- **Use**: Sidebar chevron morph (collapse)
- **Premium Only**: ✅
- **Segments**: 0-45 (hamburger → X)

### `sidebar-expand.lottie`
- **Source**: Same as above (reverse)
- **Path**: `public/animations/sidebar/sidebar-expand.lottie`
- **Size**: ~10KB
- **Use**: Sidebar chevron morph (expand)
- **Premium Only**: ✅
- **Segments**: 45-0 (X → hamburger)

### `nav-item-hover.lottie`
- **Source**: https://lottiefiles.com/free-animations/sidebar-menu → "Item Ripple"
- **Path**: `public/animations/sidebar/nav-item-hover.lottie`
- **Size**: ~6KB
- **Use**: Nav icon hover reaction
- **Premium Only**: ✅
- **Loop**: ❌ (play once on hover)

### `nav-item-select.lottie`
- **Source**: https://lottiefiles.com/free-animations/sidebar-menu → "Select Burst"
- **Path**: `public/animations/sidebar/nav-item-select.lottie`
- **Size**: ~7KB
- **Use**: Nav item click confirmation
- **Premium Only**: ✅
- **Loop**: ❌

---

## Action Animations

### `export-success.lottie`
- **Source**: https://lottiefiles.com/free-animation/success-animation-tkSmff4Qcn
- **Path**: `public/animations/actions/export-success.lottie`
- **Size**: ~14KB
- **Use**: Export complete toast/notification
- **Premium Only**: ✅
- **Loop**: ❌

### `save-success.lottie`
- **Source**: https://lottiefiles.com/free-animation/check-success-Orf3xxrkiV
- **Path**: `public/animations/actions/save-success.lottie`
- **Size**: ~9KB
- **Use**: Form save, inline actions
- **Premium Only**: ✅
- **Loop**: ❌

### `delete-confirm.lottie`
- **Source**: https://lottiefiles.com/search?q=trash → "Delete Poof"
- **Path**: `public/animations/actions/delete-confirm.lottie`
- **Size**: ~11KB
- **Use**: Delete dialog confirm
- **Premium Only**: ✅
- **Loop**: ❌

### `filter-apply.lottie`
- **Source**: https://lottiefiles.com/free-animation/search-data-liOEKdMtWA
- **Path**: `public/animations/actions/filter-apply.lottie`
- **Size**: ~8KB
- **Use**: Filter panel apply
- **Premium Only**: ✅
- **Loop**: ❌

### `sync-complete.lottie`
- **Source**: https://lottiefiles.com/search?q=sync → "Cloud Sync Done"
- **Path**: `public/animations/actions/sync-complete.lottie`
- **Size**: ~10KB
- **Use**: Marketplace sync complete
- **Premium Only**: ✅
- **Loop**: ❌

---

## State Animations

### `empty-state.lottie`
- **Source**: https://lottiefiles.com/free-animations/empty-state → "Minimal Gem"
- **Path**: `public/animations/states/empty-state.lottie`
- **Size**: ~12KB
- **Use**: No inventory, no results
- **Premium Only**: ✅
- **Loop**: ✅ (subtle)

### `error-state.lottie`
- **Source**: https://lottiefiles.com/search?q=error → "Alert Pulse"
- **Path**: `public/animations/states/error-state.lottie`
- **Size**: ~10KB
- **Use**: API errors, failed loads
- **Premium Only**: ✅
- **Loop**: ✅

### `no-data.lottie`
- **Source**: https://lottiefiles.com/free-animations/no-data → "Magnifying Glass"
- **Path**: `public/animations/states/no-data.lottie`
- **Size**: ~9KB
- **Use**: Search empty, table empty
- **Premium Only**: ✅
- **Loop**: ✅

---

## Decorative Animations

### `gem-sparkle.lottie`
- **Source**: https://lottiefiles.com/free-animations/gem → "Sparkle Loop"
- **Path**: `public/animations/decorative/gem-sparkle.lottie`
- **Size**: ~7KB
- **Use**: Dashboard background decor, active nav indicator
- **Premium Only**: ✅
- **Loop**: ✅

### `dashboard-bg.lottie`
- **Source**: https://lottiefiles.com/free-animations/dashboard → "Isometric Grid"
- **Path**: `public/animations/decorative/dashboard-bg.lottie`
- **Size**: ~16KB
- **Use**: Dashboard ambient background
- **Premium Only**: ✅
- **Loop**: ✅

---

## Total Estimated Size: ~180KB (compressed dotLottie)

## Fallback Strategy
Each component has a CSS-only fallback defined in `globals.css`:
- `.sass-skeleton` for loaders
- `.animate-spin` for spinners
- Static Lucide icons for nav items
- Empty state illustrations via CSS

## Premium Mode Gate
All animations only render when:
```html
<html data-premium="true">
```
Controlled by user preference in `localStorage` / database.

## Reduced Motion
Respects `@media (prefers-reduced-motion: reduce)`:
- Animations pause at first frame
- CSS fallbacks take over
- No layout shift