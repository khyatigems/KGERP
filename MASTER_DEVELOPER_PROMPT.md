# MASTER DEVELOPER PROMPT: ERP INTELLIGENCE EXPANSION, PHASED DELIVERY & DASHBOARD UI — KhyatiGems™ ERP

## 🎯 OBJECTIVE

Upgrade KhyatiGems™ ERP v3 from a functional ERP to an intelligence-driven, risk-aware, enterprise-grade operations system, without feature bloat.

This work must be delivered in phases, with minimal schema changes, and a clean, non-financial dashboard UX.

---

## 🧭 PHASED IMPLEMENTATION PLAN (LOCKED)

### 🔵 PHASE 1 — GO-LIVE CRITICAL (IMMEDIATE VALUE)
**Focus**: Operational safety, cash rotation, audit readiness, and daily usability.

#### Features to Implement

**1️⃣ Inventory Intelligence**
*   **Inventory aging**: 0–30 / 31–60 / 61–90 / 90+ days.
*   **MEMO duration tracking**.
*   **Alert if**:
    *   SKU in MEMO > configurable days.
    *   SKU unsold > configurable days.

**2️⃣ Attention Required Widget (Dashboard)**
*   **Auto-generated list (no manual input)**:
    *   Quotations expiring today / tomorrow.
    *   Invoices unpaid > X days.
    *   Inventory in MEMO > X days.
    *   Vendors pending approval.
*   **Severity color**:
    *   🔴 Red = Immediate
    *   🟡 Yellow = Upcoming
    *   🟢 Green = OK

**3️⃣ SKU Integrity Controls**
*   Warn if **selling price < cost** (unless allowed in settings).
*   **Detect duplicate-like SKUs**:
    *   Same gem + same weight ± tolerance.
*   **SKU-level edit history timeline** (read-only).

**4️⃣ Dashboard UX Enhancements**
*   Sticky Notes widget (already approved).
*   Print Label Cart widget.
*   **Today’s Actions widget**:
    *   Inventory added today.
    *   Quotations sent today.
    *   Labels printed today.
    *   Invoices created today.

#### DB Schema Changes (PHASE 1 — REQUIRED)
```prisma
model InventoryMetrics {
  inventoryId   String   @id
  daysInStock   Int
  memoDays      Int?
  lastUpdated   DateTime @updatedAt
}
// (Computed nightly or on state change)
```

---

### 🟡 PHASE 2 — BUSINESS INTELLIGENCE (CONTROL & INSIGHT)
**Focus**: Vendor risk, pricing effectiveness, quotation intelligence.

#### Features to Implement

**1️⃣ Inventory Turnover Report**
*   Days to sell per SKU.
*   Category-wise turnover.
*   Vendor-wise turnover.

**2️⃣ Vendor Dependency Risk Report**
*   % of inventory value from:
    *   Top 1 vendor.
    *   Top 3 vendors.
*   Flag high dependency.

**3️⃣ Pricing Effectiveness Report**
*   Initial price vs final sale price.
*   Discount frequency.
*   Price revision count per SKU.

**4️⃣ Quotation Loss Analysis**
*   For expired quotations:
    *   SKU
    *   Price range
    *   Customer city
    *   Time-to-expiry

#### DB Schema Changes (PHASE 2 — REQUIRED)
```prisma
model InventoryPriceHistory {
  id           String   @id @default(uuid())
  inventoryId  String
  oldPrice     Float
  newPrice     Float
  changedById  String
  changedAt    DateTime @default(now())
}
// (Used for pricing effectiveness + audit)
```

---

### 🟢 PHASE 3 — ENTERPRISE MATURITY (OPTIONAL, FUTURE)
**Focus**: Governance, forecasting, system resilience.

#### Features to Implement

**1️⃣ System Freeze Mode**
*   Read-only ERP toggle.
*   Used during audits / reconciliation.

**2️⃣ Data Completeness Rules**
*   **Configurable in Settings**:
    *   Block sale if certification missing.
    *   Block listing if images < N.
    *   Block invoice if customer name missing.

**3️⃣ Customer Intelligence**
*   Repeat customer flag.
*   Customer purchase timeline.
*   Average ticket size.

**4️⃣ Advanced Ops Intelligence (Optional)**
*   Suggested selling price (based on history).
*   Likely-to-sell indicator.
*   Category heatmap.

#### DB Schema Changes (PHASE 3 — OPTIONAL)
```prisma
model CustomerMetrics {
  customerId     String   @id
  totalPurchases Int
  avgTicketSize  Float
  lastPurchaseAt DateTime?
}
```

---

## 🎨 DASHBOARD WIDGET UI DESIGN (FINAL)

### 📊 DASHBOARD LAYOUT (DESKTOP)
```text
┌─────────────────────────────┐
│ KPI CARDS (Counts Only)     │
│ Inventory | Listings | ...  │
├─────────────────────────────┤
│ Attention Required          │
│ (Red / Yellow / Green list) │
├───────────────┬─────────────┤
│ Print Cart    │ Sticky Notes│
│ Widget        │ Widget      │
├───────────────┴─────────────┤
│ Today’s Actions             │
├─────────────────────────────┤
│ Activity Feed (Right Panel) │
└─────────────────────────────┘
```

### 📱 MOBILE-FIRST DASHBOARD VARIANT
**Priority order**:
1.  KPI Cards (stacked)
2.  Attention Required
3.  Print Label Cart
4.  Sticky Notes
5.  Today’s Actions
6.  Activity Feed

**Navigation**:
*   Bottom nav: Dashboard | Inventory | Sales | Menu

### 🎨 UI DESIGN RULES (NON-NEGOTIABLE)
*   **No financial amounts on dashboard**.
*   Calm colors, no gradients.
*   Minimal icons.
*   Dark-mode compatible.
*   Fast load (cached aggregates only).

---

## 🔐 PERMISSIONS
*   **Phase 1 features**: Admin + Staff
*   **Phase 2 reports**: Admin only
*   **Phase 3 governance**: Admin only

## ❗ BRANDING RULE
*   Use **KhyatiGems™** everywhere (™ mandatory).

## ✅ FINAL DELIVERY EXPECTATION

**After Phase 1**:
*   ERP becomes operationally intelligent.
*   Risks surface automatically.
*   Staff focuses on action, not searching.

**After Phase 2**:
*   Owner-level decision intelligence unlocked.

**After Phase 3**:
*   ERP reaches enterprise governance maturity.

---

## 🧠 FINAL NOTE
This plan avoids over-engineering while ensuring long-term dominance of your internal system.
**This prompt is now FINAL, PRIORITIZED, AND IMPLEMENTATION-READY.**
