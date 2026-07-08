import assert from "node:assert/strict";
import { getPermissionsForRole, PERMISSIONS } from "@/lib/permissions";

const accountsPermissions = getPermissionsForRole("ACCOUNTS");

assert(accountsPermissions.includes(PERMISSIONS.INVENTORY_VIEW), "ACCOUNTS should have inventory view access");
assert(accountsPermissions.includes(PERMISSIONS.LISTINGS_VIEW), "ACCOUNTS should have marketplace/listings access");
assert(accountsPermissions.includes(PERMISSIONS.REPORTS_VIEW), "ACCOUNTS should have reports access");

console.log("Accounts role permissions regression test passed");
