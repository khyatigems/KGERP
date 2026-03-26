import { prisma } from "@/lib/prisma";

export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_VIEW_COST: "inventory:view_cost",
  
  // Quotations
  QUOTATION_VIEW: "quotations:view",
  QUOTATION_CREATE: "quotations:create",
  QUOTATION_EDIT: "quotations:edit",
  QUOTATION_APPROVE: "quotations:approve",
  
  // Sales
  SALES_VIEW: "sales:view",
  SALES_CREATE: "sales:create",
  SALES_EDIT: "sales:edit",
  SALES_DELETE: "sales:delete",
  
  // Invoices
  INVOICE_CREATE: "invoices:create",
  INVOICE_MANAGE: "invoices:manage",
  INVOICE_DELETE: "invoices:delete",
  
  // Vendors
  VENDOR_VIEW: "vendors:view",
  VENDOR_MANAGE: "vendors:manage",
  
  // Customers
  CUSTOMER_VIEW: "customers:view",
  CUSTOMER_CREATE: "customers:create",
  CUSTOMER_EDIT: "customers:edit",
  CUSTOMER_DELETE: "customers:delete",
  CUSTOMER_MANAGE: "customers:manage",
  CUSTOMER_EXPORT: "customers:export",
  
  // Receivables
  RECEIVABLES_VIEW: "receivables:view",
  RECEIVABLES_MANAGE: "receivables:manage",
  
  // Settings
  SETTINGS_MANAGE: "settings:manage",
  USERS_MANAGE: "users:manage",
  SETTINGS_LANDING_PAGE: "settings:landing_page",
  
  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_FINANCIAL: "reports:financial",
  REPORTS_VENDOR: "reports:vendor",
  
  // Expenses
  EXPENSE_VIEW: "expenses:view",
  EXPENSE_CREATE: "expenses:create",
  EXPENSE_EDIT: "expenses:edit",
  EXPENSE_DELETE: "expenses:delete",
  EXPENSE_REPORT: "expenses:report",

  // Packaging (GPIS)
  PACKAGING_MANAGE: "packaging:manage",
  PACKAGING_VIEW: "packaging:view",
  PACKAGING_PRINT: "packaging:print",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Keep Role type for backwards compatibility in UI until fully migrated
export type Role = string;

// The static mapping is deprecated but kept temporarily so the build doesn't break
// We will replace its usage with dynamic checks
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: Object.values(PERMISSIONS),
  SALES: [],
  ACCOUNTS: [],
  VIEWER: [],
};

// Check permission dynamically from DB
export async function checkUserPermission(userId: string, permission: Permission): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleRelation: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      userPermissions: {
        include: { permission: true }
      }
    }
  });

  if (!user) return false;

  // 1. Check User overrides first
  const override = user.userPermissions.find(up => up.permission.key === permission);
  if (override) {
    return override.allow;
  }

  // 2. Fallback to Role permissions
  if (user.roleRelation) {
    // Super admin shortcut
    if (user.roleRelation.name === "SUPER_ADMIN") return true;
    
    return user.roleRelation.permissions.some(rp => rp.permission.key === permission);
  }

  // 3. Fallback to old static role mapping for transition period
  if (user.role === "SUPER_ADMIN") return true;
  return getPermissionsForRole(user.role).includes(permission);
}

export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}

// Deprecated: Only used in UI where async is not possible yet.
// Replaced by session.user.permissions array (which we will inject)
export function hasPermission(role: string, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return getPermissionsForRole(role).includes(permission);
}
