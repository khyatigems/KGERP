import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function checkUserPermissions() {
  console.log("👤 Checking User Permissions for Invoice Creation...\n");

  try {
    // Check users and their permissions
    const users = await prisma.user.findMany({
      include: {
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);

    for (const user of users) {
      console.log(`\n👤 ${(user as any).name} (${user.email})`);
      console.log(`   Role: ${(user as any).roleId || 'No role'}`);
      
      if ((user as any).userPermissions && (user as any).userPermissions.length > 0) {
        const salesCreatePerm = (user as any).userPermissions.find(
          (p: any) => p.permission.key === 'SALES_CREATE'
        );
        
        if (salesCreatePerm) {
          console.log(`   ✅ Has SALES_CREATE permission`);
        } else {
          console.log(`   ❌ Missing SALES_CREATE permission`);
          console.log(`   📋 Available permissions:`);
          (user as any).userPermissions.forEach((p: any) => {
            console.log(`      - ${p.permission.key} (${p.permission.module}: ${p.permission.action})`);
          });
        }
      } else {
        console.log(`   ❌ No permissions found`);
      }
    }

    // Check if there are any permission issues
    const salesPermission = await prisma.permission.findUnique({
      where: { key: 'SALES_CREATE' }
    });

    if (!salesPermission) {
      console.log(`\n❌ SALES_CREATE permission doesn't exist in the system`);
    } else {
      console.log(`\n✅ SALES_CREATE permission exists: ${salesPermission.module}:${salesPermission.action}`);
    }

    // Check recent activity logs for invoice creation attempts
    console.log(`\n📋 Recent Invoice Creation Attempts:`);
    const recentLogs = await prisma.activityLog.findMany({
      where: {
        entityType: 'Sale',
        actionType: 'CREATE'
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        userName: true,
        createdAt: true,
        details: true
      }
    });

    if (recentLogs.length > 0) {
      recentLogs.forEach((log: any) => {
        console.log(`   ${log.userName} - ${log.createdAt} - CREATE`);
      });
    } else {
      console.log(`   No recent invoice creation attempts found`);
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
