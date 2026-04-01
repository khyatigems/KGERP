import { ensureRbacSchema, ensureUserRoleIdColumn, hasTable, hasUserRoleIdColumn, prisma } from "@/lib/prisma";

export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_VIEW_COST: "inventory:view_cost",

  // Purchases
  PURCHASES_VIEW: "purchases:view",

  // Listings
  LISTINGS_VIEW: "listings:view",
  
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

function normalizeRoleKey(role?: string | null): string {
  if (!role) return "";
  const cleaned = role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (cleaned === "SUPERADMIN") return "SUPER_ADMIN";
  if (cleaned === "SUPER-ADMIN") return "SUPER_ADMIN";
  return cleaned;
}

function isSuperAdminRole(role?: string | null): boolean {
  const normalized = normalizeRoleKey(role);
  return normalized === "SUPER_ADMIN" || normalized === "ADMINISTRATOR";
}

// Check permission dynamically from DB
export async function checkUserPermission(userId: string, permission: Permission): Promise<boolean> {
  await ensureUserRoleIdColumn();
  const supports = await hasUserRoleIdColumn();

  await ensureRbacSchema();
  const hasUserPermissionTable = await hasTable("UserPermission");
  const hasRolePermissionTable = await hasTable("RolePermission");
  const hasRoleTable = await hasTable("Role");
  const hasPermissionTable = await hasTable("Permission");
  const hasRbacTables = hasUserPermissionTable && hasRolePermissionTable && hasRoleTable && hasPermissionTable;

  if (!hasRbacTables) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    if (!user) return false;
    if (isSuperAdminRole(user.role)) return true;
    return getPermissionsForRole(user.role).includes(permission);
  }

  if (!supports) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    if (!user) return false;
    if (isSuperAdminRole(user.role)) return true;
    return getPermissionsForRole(user.role).includes(permission);
  }

  try {
    const user = (await (prisma.user as any).findUnique({
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
    })) as any;


    if (!user) return false;

    const override = (user.userPermissions || []).find((up: any) => up.permission.key === permission);
    if (override) return override.allow;

    if (user.roleRelation) {
      if (isSuperAdminRole(user.roleRelation.name)) return true;
      return (user.roleRelation.permissions || []).some((rp: any) => rp.permission.key === permission);
    }

    if (isSuperAdminRole(user.role)) return true;

    try {
      const role = await (prisma as any).role.findUnique({
        where: { name: user.role },
        include: { permissions: { include: { permission: true } } }
      });
      if (isSuperAdminRole(role?.name)) return true;
      if (role?.permissions?.some((rp: any) => rp.permission?.key === permission)) return true;
    } catch {}

    return getPermissionsForRole(user.role).includes(permission);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("no such column") && msg.includes("roleId")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      if (!user) return false;
      if (isSuperAdminRole(user.role)) return true;
      return getPermissionsForRole(user.role).includes(permission);
    }
    throw error;
  }
}

export function getPermissionsForRole(role: string): Permission[] {
  const key = normalizeRoleKey(role);
  return ROLE_PERMISSIONS[key as keyof typeof ROLE_PERMISSIONS] || [];
}

// Deprecated: Only used in UI where async is not possible yet.
// Replaced by session.user.permissions array (which we will inject)
export function hasPermission(role: string, permission: Permission): boolean {
  if (isSuperAdminRole(role)) return true;
  return getPermissionsForRole(role).includes(permission);
}
