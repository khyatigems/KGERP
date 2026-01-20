# ERP Dark Theme Documentation

## Overview
This project uses a professional ERP Dark Theme designed for reduced eye strain and high readability during prolonged usage. The theme is implemented using CSS variables in `app/globals.css` and is fully compatible with Tailwind CSS.

## Color Palette Strategy
The theme uses the **OKLCH** color space for perceptual uniformity.
- **Hue**: ~260 (Deep Blue/Slate) - Provides a cool, professional, and calming atmosphere.
- **Chroma**: Low to Medium - Ensures colors are not too saturated (distracting) but vibrant enough for hierarchy.
- **Lightness**: Carefully balanced for contrast without the harshness of pure black (`0`) or pure white (`1`).

## Customization Guide

To customize the theme, modify the CSS variables in the `.dark` block of `app/globals.css`.

### Core Colors
| Variable | Description | Recommended Usage |
|----------|-------------|-------------------|
| `--background` | Main app background | Deep shades (L < 0.2) |
| `--foreground` | Main text color | High lightness (L > 0.9) |
| `--card` | Component background | Slightly lighter than background |
| `--primary` | Main action buttons | Brand color (Blue/Indigo) |
| `--secondary` | Secondary actions | Muted slate/gray |
| `--muted` | De-emphasized areas | Low visibility backgrounds |
| `--border` | Dividers and borders | Low opacity or subtle slate |

### Interactive Elements
- **Buttons**: Controlled by `--primary` and `--secondary`.
- **Inputs**: Controlled by `--input` and `--ring` (focus state).
- **Sidebar**: Controlled by `--sidebar-*` variables.

### Example: Changing Accent Color
To change the primary brand color from Blue to Purple:
1. Open `app/globals.css`.
2. Locate `--primary` inside `.dark`.
3. Change `oklch(0.55 0.15 260)` to `oklch(0.60 0.15 300)`.
4. Update `--ring` and `--sidebar-primary` to match.

## Accessibility
The theme maintains a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text/UI components against their backgrounds.
