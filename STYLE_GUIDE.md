# KhyatiGems ERP Style Guide

## 1. Overview
This style guide defines the design system for the KhyatiGems ERP. It ensures consistency, accessibility, and a professional user experience across all modules.

## 2. Color System (Dark Theme)
The ERP uses a "Professional Cool Slate" dark theme designed for reduced eye strain and high contrast.

| Role | Variable | Hex (Approx) | Usage |
|------|----------|--------------|-------|
| **Background** | `--background` | `#1d2330` | Main application background |
| **Surface** | `--card` | `#232836` | Cards, panels, modals |
| **Primary** | `--primary` | `#3b82f6` | Primary actions, active states |
| **Text** | `--foreground` | `#f1f5f9` | Primary text content |
| **Muted** | `--muted` | `#334155` | Secondary text, borders, inactive states |
| **Table Bg** | N/A | `#121212` | Data table container background |
| **Table Row** | N/A | `#1E1E1E` | Data table row background |

## 3. Typography
- **Font Family**: Inter (System Default)
- **Base Size**: 14px (`text-sm`) for standard UI elements.
- **Headings**:
  - `h1`: 24px/30px, Semibold
  - `h2`: 20px, Semibold
  - `h3`: 18px, Medium

## 4. UI Components

### 4.1. Navigation Sidebar
- **Background**: `--sidebar` (Deep Slate)
- **Active Item**: Left border highlight (`border-l-4`), subtle background tint.
- **Hover State**: Smooth background transition, no scaling.
- **Icons**: Lucide React icons, consistent sizing (16x16px).

### 4.2. Page Header
- **Context**: Dynamically displays module name (e.g., "Inventory Management").
- **Breadcrumbs**: Located below the title for navigation history.
- **Actions**: Global actions (Logout, User Profile) on the right.

### 4.3. Data Tables
- **Container**: `bg-[#121212]`, Rounded corners, Bordered.
- **Header**: Sticky/Fixed, contrast text.
- **Rows**: `bg-[#1E1E1E]`, alternating or solid.
- **Interaction**: Highlight on hover (`bg-[#2A2A2A]`).
- **Typography**: Clear, legible, whitespace-nowrap for density.

### 4.4. Settings & Configuration
- **Layout**: Horizontal tabs for module separation (Module, General, Advanced).
- **Search**: Real-time search filter for finding settings quickly.
- **Grouping**: Use Cards to group related configuration items.
- **Deduplication**: All lists must ensure unique keys using `lib/dedup.ts`.

## 5. Accessibility (WCAG 2.1 AA)
- **Contrast**: All text must meet 4.5:1 contrast ratio against background.
- **Focus**: Visible focus rings on all interactive elements.
- **Semantic HTML**: Use proper `<nav>`, `<main>`, `<table>`, `<header>` tags.
- **ARIA**: Use `aria-label` for icon-only buttons.
- **Error Handling**: Use Error Boundaries and fallbacks for missing components.

## 6. Implementation Rules
1.  **Do not hardcode colors** outside of the specific Table overrides. Use CSS variables.
2.  **Use `shadcn/ui` components** as the base.
3.  **Ensure responsive design**: Tables must scroll horizontally on mobile. Sidebar should collapse/hide.
4.  **Data Integrity**: Always deduplicate list data before rendering.
