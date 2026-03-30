import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function createSalesPermission() {
  console.log("🔧 Creating Missing SALES_CREATE Permission...\n");

  try {
    // Check if permission already exists
    const existingPerm = await prisma.permission.findUnique({
      where: { key: 'SALES_CREATE' }
    });

    if (existingPerm) {
      console.log("✅ SALES_CREATE permission already exists");
      return;
    }

    // Create the permission
    const newPermission = await prisma.permission.create({
      data: {
        key: 'SALES_CREATE',
        module: 'sales',
        action: 'create',
        description: 'Create new sales invoices'
      }
    });

    console.log("✅ Created SALES_CREATE permission:");
    console.log(`   ID: ${newPermission.id}`);
    console.log(`   Key: ${newPermission.key}`);
    console.log(`   Module: ${newPermission.module}`);
    console.log(`   Action: ${newPermission.action}`);
    console.log(`   Description: ${newPermission.description}`);

    // Assign to admin role (if exists)
    const adminRole = await prisma.role.findFirst({
      where: { name: { contains: 'admin' } }
    });

    if (adminRole) {
      // Note: UserPermission table links users to permissions, not roles to permissions
      // We need to assign this permission to users in the admin role
      const adminUsers = await prisma.user.findMany({
        where: { roleId: adminRole.id }
      });

      for (const user of adminUsers) {
        await prisma.userPermission.create({
          data: {
            userId: user.id,
            permissionId: newPermission.id,
            allow: true
          }
        });
        console.log(`   ✅ Assigned to ${user.name}`);
      }
      console.log(`✅ Assigned SALES_CREATE to ${adminUsers.length} admin users`);
    } else {
      console.log("⚠️  No admin role found - you'll need to manually assign permissions");
    }

    // Also create SALES_EDIT, SALES_DELETE, SALES_VIEW for completeness
    const additionalPerms = [
      { key: 'SALES_EDIT', module: 'sales', action: 'edit', description: 'Edit existing sales invoices' },
      { key: 'SALES_DELETE', module: 'sales', action: 'delete', description: 'Delete sales invoices' },
      { key: 'SALES_VIEW', module: 'sales', action: 'view', description: 'View sales invoices' }
    ];

    for (const permData of additionalPerms) {
      const exists = await prisma.permission.findUnique({
        where: { key: permData.key }
      });

      if (!exists) {
        const created = await prisma.permission.create({
          data: permData
        });
        console.log(`✅ Created ${permData.key} permission`);
      } else {
        console.log(`✅ ${permData.key} already exists`);
      }
    }

    console.log("\n🎉 Permission setup completed!");
    console.log("💡 Next steps:");
    console.log("   1. Assign these permissions to appropriate user roles");
    console.log("   2. Try creating an invoice again");
    console.log("   3. If still failing, check user role assignments");

  } catch (error) {
    console.error("❌ Failed to create permissions:", error);
  }

  await prisma.$disconnect();
}

createSalesPermission().catch((error) => {
  console.error("❌ Script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
