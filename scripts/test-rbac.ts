
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS, Role } from "../lib/permissions";

const ROUTES = {
  "/reports": PERMISSIONS.REPORTS_VIEW,
  "/settings": PERMISSIONS.SETTINGS_MANAGE,
  "/users": PERMISSIONS.USERS_MANAGE,
  "/sales": PERMISSIONS.SALES_VIEW,
  "/purchases": PERMISSIONS.INVENTORY_VIEW_COST,
  "/vendors": PERMISSIONS.VENDOR_VIEW,
};

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "SALES", "ACCOUNTS", "VIEWER"];

console.log("=== RBAC Logic Verification ===");

ROLES.forEach(role => {
  console.log(`\nChecking Role: ${role}`);
  console.log("Permissions:", ROLE_PERMISSIONS[role].length);
  
  Object.entries(ROUTES).forEach(([route, requiredPerm]) => {
    const allowed = hasPermission(role, requiredPerm);
    const indicator = allowed ? "✅ ALLOWED" : "❌ DENIED";
    console.log(`  ${route.padEnd(12)} -> ${requiredPerm.padEnd(20)} : ${indicator}`);
  });
});

console.log("\n=== Specific Check for abc@gmail.com (VIEWER) ===");
const viewerRole = "VIEWER";
const viewerChecks = [
  { route: "/reports", perm: PERMISSIONS.REPORTS_VIEW, expected: false },
  { route: "/settings", perm: PERMISSIONS.SETTINGS_MANAGE, expected: false },
  { route: "/users", perm: PERMISSIONS.USERS_MANAGE, expected: false },
  { route: "/sales", perm: PERMISSIONS.SALES_VIEW, expected: false }, // SALES_VIEW is not in VIEWER
  { route: "/purchases", perm: PERMISSIONS.INVENTORY_VIEW_COST, expected: false },
  { route: "/vendors", perm: PERMISSIONS.VENDOR_VIEW, expected: false },
  { route: "/inventory", perm: PERMISSIONS.INVENTORY_VIEW, expected: true },
];

let failures = 0;
viewerChecks.forEach(check => {
  const result = hasPermission(viewerRole, check.perm);
  if (result !== check.expected) {
    console.error(`FAILURE: ${check.route} for VIEWER should be ${check.expected}, got ${result}`);
    failures++;
  } else {
    console.log(`PASS: ${check.route} correctly ${check.expected ? "allowed" : "denied"} for VIEWER`);
  }
});

if (failures === 0) {
  console.log("\n✅ All VIEWER checks passed.");
} else {
  console.error(`\n❌ ${failures} checks failed.`);
  process.exit(1);
}
