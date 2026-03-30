import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking existing permissions schema...");
  
  // Check existing permissions
  const existingPerms = await prisma.permission.findMany({
    take: 5
  });
  
  console.log(`Existing permissions: ${existingPerms.length}`);
  if (existingPerms.length > 0) {
    console.log("Sample permission:", existingPerms[0]);
  }
  
  // Check existing roles
  const existingRoles = await prisma.role.findMany({
    take: 5
  });
  
  console.log(`Existing roles: ${existingRoles.length}`);
  if (existingRoles.length > 0) {
    console.log("Sample role:", existingRoles[0]);
  }
  
  // Create basic permissions using raw SQL to avoid schema issues
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
  
  console.log("Creating permissions using raw SQL...");
  for (const perm of permissions) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO "Permission" (id, module, action, key, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, 
      crypto.randomUUID(),
      perm.module,
      perm.action,
      perm.key,
      perm.description
      );
    } catch (error) {
      console.log(`Permission ${perm.key} already exists or failed:`, (error as Error).message);
    }
  }
  
  // Create roles using raw SQL
  const roles = [
    { name: "SUPER_ADMIN", description: "Super Administrator - Full access" },
    { name: "ADMIN", description: "Administrator - Most access" },
    { name: "MANAGER", description: "Manager - Business operations" },
    { name: "USER", description: "User - Basic operations" },
    { name: "VIEWER", description: "Viewer - Read-only access" }
  ];
  
  console.log("Creating roles using raw SQL...");
  for (const role of roles) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO "Role" (id, name, description, isSystem, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, 
      crypto.randomUUID(),
      role.name,
      role.description,
      true,
      true
      );
    } catch (error) {
      console.log(`Role ${role.name} already exists or failed:`, (error as Error).message);
    }
  }
  
  // Get all permissions and roles
  const allPermissions = await prisma.permission.findMany();
  const allRoles = await prisma.role.findMany();
  
  console.log(`Found ${allPermissions.length} permissions and ${allRoles.length} roles`);
  
  // Assign all permissions to SUPER_ADMIN
  const superAdminRole = allRoles.find(r => r.name === 'SUPER_ADMIN');
  if (superAdminRole) {
    console.log("Assigning all permissions to SUPER_ADMIN...");
    for (const permission of allPermissions) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId)
          VALUES (?, ?, ?)
        `, 
        crypto.randomUUID(),
        superAdminRole.id,
        permission.id
        );
      } catch (error) {
        console.log(`Failed to assign ${permission.key} to SUPER_ADMIN:`, (error as Error).message);
      }
    }
  }
  
  // Assign basic permissions to VIEWER
  const viewerRole = allRoles.find(r => r.name === 'VIEWER');
  const viewerPermissions = allPermissions.filter(p => 
    p.key.includes('.view') || p.key.includes('dashboard')
  );
  
  if (viewerRole) {
    console.log("Assigning view-only permissions to VIEWER...");
    for (const permission of viewerPermissions) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId)
          VALUES (?, ?, ?)
        `, 
        crypto.randomUUID(),
        viewerRole.id,
        permission.id
        );
      } catch (error) {
        console.log(`Failed to assign ${permission.key} to VIEWER:`, (error as Error).message);
      }
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
