import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Creating basic permissions and roles...");
  
  // Create basic permissions
  const permissions = [
    // Dashboard
    { key: "dashboard.view", module: "dashboard", action: "view", description: "View dashboard" },
    { key: "dashboard.widgets", module: "dashboard", action: "widgets", description: "Access dashboard widgets" },
    
    // Sales
    { key: "sales.view", module: "sales", action: "view", description: "View sales" },
    { key: "sales.create", module: "sales", action: "create", description: "Create sales" },
    { key: "sales.edit", module: "sales", action: "edit", description: "Edit sales" },
    { key: "sales.delete", module: "sales", action: "delete", description: "Delete sales" },
    
    // Inventory
    { key: "inventory.view", module: "inventory", action: "view", description: "View inventory" },
    { key: "inventory.create", module: "inventory", action: "create", description: "Create inventory" },
    { key: "inventory.edit", module: "inventory", action: "edit", description: "Edit inventory" },
    { key: "inventory.delete", module: "inventory", action: "delete", description: "Delete inventory" },
    
    // Customers
    { key: "customers.view", module: "customers", action: "view", description: "View customers" },
    { key: "customers.create", module: "customers", action: "create", description: "Create customers" },
    { key: "customers.edit", module: "customers", action: "edit", description: "Edit customers" },
    { key: "customers.delete", module: "customers", action: "delete", description: "Delete customers" },
    
    // Invoices
    { key: "invoices.view", module: "invoices", action: "view", description: "View invoices" },
    { key: "invoices.create", module: "invoices", action: "create", description: "Create invoices" },
    { key: "invoices.edit", module: "invoices", action: "edit", description: "Edit invoices" },
    { key: "invoices.delete", module: "invoices", action: "delete", description: "Delete invoices" },
    
    // Reports
    { key: "reports.view", module: "reports", action: "view", description: "View reports" },
    { key: "reports.export", module: "reports", action: "export", description: "Export reports" },
    
    // Accounting
    { key: "accounting.view", module: "accounting", action: "view", description: "View accounting" },
    { key: "accounting.create", module: "accounting", action: "create", description: "Create accounting entries" },
    { key: "accounting.vouchers", module: "accounting", action: "vouchers", description: "Manage vouchers" },
    
    // Settings
    { key: "settings.view", module: "settings", action: "view", description: "View settings" },
    { key: "settings.edit", module: "settings", action: "edit", description: "Edit settings" },
    
    // Admin
    { key: "admin.users", module: "admin", action: "users", description: "Manage users" },
    { key: "admin.roles", module: "admin", action: "roles", description: "Manage roles" },
    { key: "admin.permissions", module: "admin", action: "permissions", description: "Manage permissions" }
  ];
  
  console.log("Creating permissions...");
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description
      },
      create: {
        key: perm.key,
        module: perm.module,
        action: perm.action,
        description: perm.description
      }
    });
  }
  
  // Create roles
  const roles = [
    { name: "SUPER_ADMIN", description: "Super Administrator - Full access" },
    { name: "ADMIN", description: "Administrator - Most access" },
    { name: "MANAGER", description: "Manager - Business operations" },
    { name: "USER", description: "User - Basic operations" },
    { name: "VIEWER", description: "Viewer - Read-only access" }
  ];
  
  console.log("Creating roles...");
  const createdRoles = [];
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role
    });
    createdRoles.push(createdRole);
  }
  
  // Assign all permissions to SUPER_ADMIN
  const allPermissions = await prisma.permission.findMany();
  const superAdminRole = createdRoles.find(r => r.name === 'SUPER_ADMIN');
  
  if (superAdminRole) {
    console.log("Assigning all permissions to SUPER_ADMIN...");
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      });
    }
  }
  
  // Assign basic permissions to VIEWER
  const viewerRole = createdRoles.find(r => r.name === 'VIEWER');
  const viewerPermissions = allPermissions.filter(p => 
    p.key.includes('.view') || p.key.includes('dashboard')
  );
  
  if (viewerRole) {
    console.log("Assigning view-only permissions to VIEWER...");
    for (const permission of viewerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: permission.id
        }
      });
    }
  }
  
  console.log("✅ Permissions and roles setup complete!");
  
  // Summary
  const totalPermissions = await prisma.permission.count();
  const totalRoles = await prisma.role.count();
  const totalRolePermissions = await prisma.rolePermission.count();
  
  console.log(`\n📊 Summary:`);
  console.log(`  Permissions: ${totalPermissions}`);
  console.log(`  Roles: ${totalRoles}`);
  console.log(`  Role-Permission mappings: ${totalRolePermissions}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
