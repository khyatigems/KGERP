import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking user permissions and roles...");
  
  // Check users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`\n👥 Total users: ${users.length}`);
  users.forEach(user => {
    console.log(`  ${user.name || user.email} - Role: ${user.role}`);
  });
  
  // Check permissions
  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      key: true,
      module: true,
      action: true
    },
    take: 20
  });
  
  console.log(`\n🔐 Total permissions: ${permissions.length}`);
  permissions.forEach(perm => {
    console.log(`  ${perm.key}: ${perm.action} on ${perm.module}`);
  });
  
  // Check role permissions
  const rolePermissions = await prisma.rolePermission.findMany({
    select: {
      roleId: true,
      permissionId: true
    },
    take: 20
  });
  
  console.log(`\n🔑 Role-Permission mappings: ${rolePermissions.length}`);
  
  // Check user permissions
  const userPermissions = await prisma.userPermission.findMany({
    select: {
      userId: true,
      permissionId: true
    },
    take: 20
  });
  
  console.log(`\n👤 User-Permission mappings: ${userPermissions.length}`);
  
  // Check if there are any admin users
  const adminUsers = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
  console.log(`\n👑 Admin users: ${adminUsers.length}`);
  adminUsers.forEach(admin => {
    console.log(`  ${admin.name || admin.email} (${admin.role})`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
