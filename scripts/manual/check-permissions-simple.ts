import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function checkUserPermissions() {
  console.log("👤 Checking User Permissions for Invoice Creation...\n");

  try {
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true
      }
    });

    console.log(`Found ${users.length} users:`);

    for (const user of users) {
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log(`   Role ID: ${user.roleId || 'No role'}`);
    }

    // Check if SALES_CREATE permission exists
    const salesPermission = await prisma.permission.findUnique({
      where: { key: 'SALES_CREATE' }
    });

    if (!salesPermission) {
      console.log(`\n❌ SALES_CREATE permission doesn't exist in the system`);
      
      // Check what permissions do exist
      const allPermissions = await prisma.permission.findMany({
        take: 10,
        select: {
          key: true,
          module: true,
          action: true
        }
      });
      
      console.log(`\n📋 Available permissions (first 10):`);
      allPermissions.forEach(p => {
        console.log(`   - ${p.key} (${p.module}: ${p.action})`);
      });
    } else {
      console.log(`\n✅ SALES_CREATE permission exists: ${salesPermission.module}:${salesPermission.action}`);
    }

    // Check recent activity logs
    console.log(`\n📋 Recent Activity Logs:`);
    const recentLogs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        userName: true,
        createdAt: true,
        entityType: true,
        actionType: true,
        details: true
      }
    });

    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        console.log(`   ${log.userName} - ${log.createdAt} - ${log.entityType}:${log.actionType}`);
      });
    } else {
      console.log(`   No recent activity logs found`);
    }

  } catch (error) {
    console.error("❌ Failed to check permissions:", error);
  }

  await prisma.$disconnect();
}

checkUserPermissions().catch((error) => {
  console.error("❌ Script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
