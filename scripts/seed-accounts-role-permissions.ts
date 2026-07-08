import crypto from "node:crypto";
import { ensureRbacSchema, prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";

async function main() {
  await ensureRbacSchema();

  const allKeys = Array.from(new Set(Object.values(PERMISSIONS)));
  const existingPermissions = await prisma.$queryRawUnsafe<Array<{ id: string; key: string }>>(`SELECT id, key FROM "Permission"`);
  const permissionIds = new Map(existingPermissions.map((row) => [row.key, row.id]));

  for (const key of allKeys) {
    if (permissionIds.has(key)) continue;
    const [module, action] = key.split(":");
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Permission" (id, module, action, key, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      module,
      action,
      key
    );
    permissionIds.set(key, id);
  }

  const roleRows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Role"`);
  const roleByName = new Map(roleRows.map((row) => [row.name, row.id]));

  for (const roleName of ["SUPER_ADMIN", "ADMIN", "SALES", "ACCOUNTS", "VIEWER"]) {
    if (roleByName.has(roleName)) continue;
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Role" (id, name, isSystem, isActive, createdAt, updatedAt)
       VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      roleName
    );
    roleByName.set(roleName, id);
  }

  const rolePermissionKeys: Record<string, string[]> = {
    SUPER_ADMIN: allKeys,
    ADMIN: allKeys,
    ACCOUNTS: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.LISTINGS_VIEW, PERMISSIONS.REPORTS_VIEW],
  };

  for (const [roleName, keys] of Object.entries(rolePermissionKeys)) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) continue;
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId) VALUES (?, ?, ?)`,
        crypto.randomUUID(),
        roleId,
        permissionId
      );
    }
  }

  const accountsRole = roleByName.get("ACCOUNTS");
  if (accountsRole) {
    const assigned = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      `SELECT p.key FROM "RolePermission" rp JOIN "Permission" p ON p.id = rp.permissionId WHERE rp.roleId = ?`,
      accountsRole
    );
    console.log("Accounts role permissions:", assigned.map((row) => row.key).join(", "));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
