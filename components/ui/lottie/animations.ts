"use client";

export type AnimationKey =
  | "globalLoader"
  | "dashboardLoader"
  | "widgetLoader"
  | "exportLoader"
  | "sidebarCollapse"
  | "sidebarExpand"
  | "navItemHover"
  | "navItemSelect"
  | "exportSuccess"
  | "saveSuccess"
  | "deleteConfirm"
  | "filterApply"
  | "syncComplete"
  | "emptyState"
  | "errorState"
  | "noData"
  | "gemSparkle"
  | "dashboardBg"
  | "navDashboard"
  | "navInventory"
  | "navListings"
  | "navControlCenter"
  | "navConflicts"
  | "navReconciliation"
  | "navQuotes"
  | "navSales"
  | "navSalesReturns"
  | "navAdvances"
  | "navPurchases"
  | "navVendors"
  | "navCustomers"
  | "navLabels"
  | "navPackaging"
  | "navInvoices"
  | "navCommunication"
  | "navReports"
  | "navUsers"
  | "navSettings"
  | "navMatchedPairs";

export interface AnimationConfig {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  segments?: [number, number];
  premiumOnly?: boolean;
}

export const animations: Record<AnimationKey, AnimationConfig> = {
  globalLoader: {
    src: "/animations/loading/global-loader.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  dashboardLoader: {
    src: "/animations/loading/dashboard-loader.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  widgetLoader: {
    src: "/animations/loading/widget-loader.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  exportLoader: {
    src: "/animations/loading/export-loader.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  sidebarCollapse: {
    src: "/animations/sidebar/sidebar-collapse.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
    segments: [0, 45],
  },
  sidebarExpand: {
    src: "/animations/sidebar/sidebar-expand.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
    segments: [45, 0],
  },
  navItemHover: {
    src: "/animations/sidebar/nav-item-hover.json",
    loop: false,
    autoplay: false,
    premiumOnly: true,
  },
  navItemSelect: {
    src: "/animations/sidebar/nav-item-select.json",
    loop: false,
    autoplay: false,
    premiumOnly: true,
  },
  exportSuccess: {
    src: "/animations/actions/export-success.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
  },
  saveSuccess: {
    src: "/animations/actions/save-success.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
  },
  deleteConfirm: {
    src: "/animations/actions/delete-confirm.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
  },
  filterApply: {
    src: "/animations/actions/filter-apply.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
  },
  syncComplete: {
    src: "/animations/actions/sync-complete.json",
    loop: false,
    autoplay: true,
    premiumOnly: true,
  },
  emptyState: {
    src: "/animations/states/empty-state.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  errorState: {
    src: "/animations/states/error-state.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  noData: {
    src: "/animations/states/no-data.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  gemSparkle: {
    src: "/animations/decorative/gem-sparkle.json",
    loop: true,
    autoplay: true,
    premiumOnly: false,
  },
  dashboardBg: {
    src: "/animations/decorative/dashboard-bg.json",
    loop: true,
    autoplay: true,
    premiumOnly: true,
  },
  navDashboard: {
    src: "/animations/sidebar/dashboard.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navInventory: {
    src: "/animations/sidebar/inventory.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navListings: {
    src: "/animations/sidebar/listings.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navControlCenter: {
    src: "/animations/sidebar/control-center.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navConflicts: {
    src: "/animations/sidebar/conflicts.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navReconciliation: {
    src: "/animations/sidebar/reconciliation.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navQuotes: {
    src: "/animations/sidebar/quotes.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navSales: {
    src: "/animations/sidebar/sales.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navSalesReturns: {
    src: "/animations/sidebar/sales-returns.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navAdvances: {
    src: "/animations/sidebar/advances.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navPurchases: {
    src: "/animations/sidebar/purchases.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navVendors: {
    src: "/animations/sidebar/vendors.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navCustomers: {
    src: "/animations/sidebar/customers.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navLabels: {
    src: "/animations/sidebar/labels.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navPackaging: {
    src: "/animations/sidebar/packaging.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navInvoices: {
    src: "/animations/sidebar/invoices.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navCommunication: {
    src: "/animations/sidebar/communication.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navReports: {
    src: "/animations/sidebar/reports.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navUsers: {
    src: "/animations/sidebar/users.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navSettings: {
    src: "/animations/sidebar/settings.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
  navMatchedPairs: {
    src: "/animations/sidebar/matched-pairs.json",
    loop: true,
    autoplay: false,
    premiumOnly: false,
  },
};

export type LoaderVariant = "global" | "dashboard" | "widget" | "export";

export const loaderVariantMap: Record<LoaderVariant, AnimationKey> = {
  global: "globalLoader",
  dashboard: "dashboardLoader",
  widget: "widgetLoader",
  export: "exportLoader",
};

export type ActionVariant =
  | "export"
  | "save"
  | "delete"
  | "filter"
  | "sync";

export const actionVariantMap: Record<ActionVariant, AnimationKey> = {
  export: "exportSuccess",
  save: "saveSuccess",
  delete: "deleteConfirm",
  filter: "filterApply",
  sync: "syncComplete",
};

export type StateVariant = "empty" | "error" | "noData";

export const stateVariantMap: Record<StateVariant, AnimationKey> = {
  empty: "emptyState",
  error: "errorState",
  noData: "noData",
};

export type NavAnimationKey =
  | "dashboard"
  | "inventory"
  | "listings"
  | "control-center"
  | "conflicts"
  | "reconciliation"
  | "quotes"
  | "sales"
  | "sales-returns"
  | "advances"
  | "purchases"
  | "vendors"
  | "customers"
  | "labels"
  | "packaging"
  | "invoices"
  | "communication"
  | "reports"
  | "users"
  | "settings"
  | "matched-pairs";

export const navAnimationMap: Record<NavAnimationKey, AnimationKey> = {
  dashboard: "navDashboard",
  inventory: "navInventory",
  listings: "navListings",
  "control-center": "navControlCenter",
  conflicts: "navConflicts",
  reconciliation: "navReconciliation",
  quotes: "navQuotes",
  sales: "navSales",
  "sales-returns": "navSalesReturns",
  advances: "navAdvances",
  purchases: "navPurchases",
  vendors: "navVendors",
  customers: "navCustomers",
  labels: "navLabels",
  packaging: "navPackaging",
  invoices: "navInvoices",
  communication: "navCommunication",
  reports: "navReports",
  users: "navUsers",
  settings: "navSettings",
  "matched-pairs": "navMatchedPairs",
};

export function getAnimationConfig(key: AnimationKey): AnimationConfig {
  return animations[key];
}

export function isPremiumMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.premium === "true";
}

export function shouldRenderAnimation(config: AnimationConfig): boolean {
  if (!config.premiumOnly) return true;
  return isPremiumMode();
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}