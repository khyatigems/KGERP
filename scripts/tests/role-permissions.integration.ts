import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

async function main() {
  // Use the reporting fixture, never the ERP's configured database.
  assert(existsSync(resolve("tmp/reports-fallback-test.db")), "Run the reporting fixture test first (npm run test:roles:integration)");
  process.env.DATABASE_URL = `file:${resolve("tmp/reports-fallback-test.db").replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_URL = "";
  const { prisma } = await import("../../lib/prisma");
  const { checkUserPermission, checkUserPermissions, PERMISSIONS } = await import("../../lib/permissions");
  const permission = await prisma.permission.upsert({ where: { key: PERMISSIONS.INVENTORY_VIEW }, update: {}, create: { key: PERMISSIONS.INVENTORY_VIEW, module: "inventory", action: "view" } });
  const role = await prisma.role.create({ data: { name: `TEST_${randomUUID()}` } });
  const user = await prisma.user.create({ data: { name: "Permission test", email: `${randomUUID()}@example.test`, password: "fixture-only", role: "ADMIN", roleId: role.id } });
  const verify = async (expected: boolean) => {
    assert.equal(await checkUserPermission(user.id, PERMISSIONS.INVENTORY_VIEW), expected);
    assert.equal((await checkUserPermissions(user.id, [PERMISSIONS.INVENTORY_VIEW])).get(PERMISSIONS.INVENTORY_VIEW), expected);
  };
  try {
    await verify(false); // Empty assigned role must not inherit legacy ADMIN grants.
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    await verify(true);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await verify(false); // Removing the final permission must actually revoke access.
    await prisma.userPermission.create({ data: { userId: user.id, permissionId: permission.id, allow: true } });
    await verify(true);
    await prisma.userPermission.updateMany({ where: { userId: user.id }, data: { allow: false } });
    await verify(false);
    await prisma.userPermission.deleteMany({ where: { userId: user.id } });
    for (const key of [PERMISSIONS.LABELS_VIEW, PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.CUSTOMERS_MERGE, PERMISSIONS.ADVANCES_MANAGE, PERMISSIONS.REPORTS_CUSTOMER_INSIGHTS]) {
      const [module, action] = key.split(":");
      const entry = await prisma.permission.upsert({ where: { key }, update: {}, create: { key, module, action } });
      assert.equal(await checkUserPermission(user.id, key), false);
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: entry.id } });
      assert.equal(await checkUserPermission(user.id, key), true);
      assert.equal((await checkUserPermissions(user.id, [key])).get(key), true);
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: entry.id } });
      assert.equal(await checkUserPermission(user.id, key), false);
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "SUPER_ADMIN", roleId: null } });
    await verify(true); // Existing superadmin bypass remains unchanged.
    console.log("Assigned role grants, revocations, user overrides, and superadmin regression passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
