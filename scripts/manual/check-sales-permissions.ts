import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function checkSalesPermissions() {
  console.log("🔍 Checking SALES_CREATE Permission Assignments...\n");

  try {
    // Check if SALES_CREATE permission exists
    const salesPerm = await prisma.permission.findUnique({
      where: { key: 'SALES_CREATE' }
    });

    if (!salesPerm) {
      console.log("❌ SALES_CREATE permission doesn't exist");
      return;
    }

    console.log("✅ SALES_CREATE permission found");
    console.log(`   ID: ${salesPerm.id}`);

    // Check which users have this permission
    const userPerms = await prisma.userPermission.findMany({
      where: { permissionId: salesPerm.id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (userPerms.length > 0) {
      console.log(`\n✅ ${userPerms.length} users have SALES_CREATE permission:`);
      userPerms.forEach(up => {
        console.log(`   👤 ${up.user.name} (${up.user.email})`);
      });
    } else {
      console.log(`\n❌ NO users have SALES_CREATE permission!`);
      console.log("   This is why invoice creation is failing.");
    }

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true
      }
    });

    console.log(`\n👤 All users in system (${allUsers.length}):`);
    allUsers.forEach(user => {
      const hasPermission = userPerms.some(up => up.userId === user.id);
      console.log(`   ${hasPermission ? '✅' : '❌'} ${user.name} (${user.email})`);
    });

    // If no users have permission, assign it to admin users
    if (userPerms.length === 0) {
      console.log(`\n🔧 Assigning SALES_CREATE to admin users...`);
      
      // Find admin-like users (users with admin in name or email)
      const adminUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes('admin') || 
        user.email.toLowerCase().includes('admin')
      );

      if (adminUsers.length > 0) {
        for (const user of adminUsers) {
          await prisma.userPermission.create({
            data: {
              userId: user.id,
              permissionId: salesPerm.id,
              allow: true
            }
          });
          console.log(`   ✅ Assigned to ${user.name}`);
        }
      } else {
        // If no admin users, assign to first user
        const firstUser = allUsers[0];
        if (firstUser) {
          await prisma.userPermission.create({
            data: {
              userId: firstUser.id,
              permissionId: salesPerm.id,
              allow: true
            }
          });
          console.log(`   ✅ Assigned to ${firstUser.name} (first user)`);
        }
      }
    }

    // Verify assignments
    const finalCheck = await prisma.userPermission.findMany({
      where: { permissionId: salesPerm.id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n🎉 Final Status: ${finalCheck.length} users have SALES_CREATE permission`);
    finalCheck.forEach(up => {
      console.log(`   👤 ${up.user.name} (${up.user.email})`);
    });

    console.log(`\n💡 Next steps:`);
    console.log(`   1. Try creating an invoice again`);
    console.log(`   2. If it still fails, refresh your browser session`);
    console.log(`   3. Check if you're logged in with the correct user`);

  } catch (error) {
    console.error("❌ Failed to check permissions:", error);
  }

  await prisma.$disconnect();
}

checkSalesPermissions().catch((error) => {
  console.error("❌ Script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
