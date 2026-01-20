export const PERMISSIONS = {
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_VIEW_COST: "inventory.view_cost",
  INVENTORY_MARK_SOLD: "inventory.mark_sold",
  QUOTATION_CREATE: "quotation.create",
  QUOTATION_DISABLE: "quotation.disable",
  SALES_DELETE: "sales.delete",
  VENDOR_APPROVE: "vendor.approve",
  REPORTS_VIEW: "reports.view",
  MANAGE_LANDING_PAGE: "settings.landing_page",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  STAFF: [
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.QUOTATION_CREATE,
    // Staff restrictions can be adjusted here
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = getPermissionsForRole(role);
  return perms.includes(permission);
}
