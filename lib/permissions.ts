export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_EDIT: "inventory.edit",
  INVENTORY_DELETE: "inventory.delete",
  INVENTORY_VIEW_COST: "inventory.view_cost",
  
  // Quotations
  QUOTATION_VIEW: "quotation.view",
  QUOTATION_CREATE: "quotation.create",
  QUOTATION_EDIT: "quotation.edit",
  QUOTATION_APPROVE: "quotation.approve",
  
  // Sales & Invoices
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_DELETE: "sales.delete",
  INVOICE_CREATE: "invoice.create",
  INVOICE_MANAGE: "invoice.manage", // Status updates, etc.
  INVOICE_DELETE: "invoice.delete", // Super Admin only
  
  // Vendors
  VENDOR_VIEW: "vendor.view",
  VENDOR_MANAGE: "vendor.manage",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",
  CUSTOMER_EXPORT: "customer.export",
  RECEIVABLES_VIEW: "receivables.view",
  RECEIVABLES_MANAGE: "receivables.manage",
  
  // Reports
  REPORTS_VIEW: "reports.view", // General access (Labels, Ops)
  REPORTS_FINANCIAL: "reports.financial", // Profit, Margin, Sales Value
  REPORTS_VENDOR: "reports.vendor", // Vendor analytics
  
  // Settings & Users
  SETTINGS_MANAGE: "settings.manage",
  USERS_MANAGE: "users.manage",
  LANDING_PAGE_MANAGE: "settings.landing_page",
  
  // Expenses
  EXPENSE_VIEW: "expense.view",
  EXPENSE_CREATE: "expense.create",
  EXPENSE_EDIT: "expense.edit",
  EXPENSE_DELETE: "expense.delete", // SUPER_ADMIN only
  EXPENSE_REPORT: "expense.report",

  // Packaging (GPIS)
  PACKAGING_MANAGE: "packaging.manage", // Create serials, settings
  PACKAGING_VIEW: "packaging.view", // Ledger, logs
  PACKAGING_PRINT: "packaging.print", // Generate/print labels
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export type Role = "SUPER_ADMIN" | "ADMIN" | "SALES" | "ACCOUNTS" | "VIEWER";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  
  ADMIN: Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.INVOICE_DELETE && p !== PERMISSIONS.EXPENSE_DELETE),
  
  SALES: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.QUOTATION_CREATE,
    PERMISSIONS.QUOTATION_EDIT,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_MANAGE,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_MANAGE,
    PERMISSIONS.CUSTOMER_EXPORT,
    PERMISSIONS.RECEIVABLES_VIEW,
    PERMISSIONS.RECEIVABLES_MANAGE,
    PERMISSIONS.REPORTS_VIEW, // Can view basic reports like Labels
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.PACKAGING_VIEW, // Can view logs
    PERMISSIONS.PACKAGING_PRINT,
  ],
  
  ACCOUNTS: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_VIEW_COST,
    PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_EXPORT,
    PERMISSIONS.RECEIVABLES_VIEW,
    PERMISSIONS.RECEIVABLES_MANAGE,
    PERMISSIONS.INVOICE_MANAGE,
    
    // Expense Access
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.EXPENSE_EDIT,
    PERMISSIONS.EXPENSE_REPORT,
    PERMISSIONS.PACKAGING_VIEW,
    PERMISSIONS.PACKAGING_PRINT,
  ],
  
  VIEWER: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  // Default to empty if role doesn't exist or is invalid
  return ROLE_PERMISSIONS[role as Role] || [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = getPermissionsForRole(role);
  return perms.includes(permission);
}
