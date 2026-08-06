import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  // User Management
  'manage_users', 'view_users',
  // Roles & Permissions
  'manage_roles', 'view_roles',
  // Customers
  'manage_customers', 'view_customers',
  // Inventory
  'manage_inventory', 'view_inventory',
  // Sales
  'manage_sales', 'view_sales',
  // Expenses
  'manage_expenses', 'view_expenses',
  // Reports
  'view_reports',
  // Settings
  'manage_settings',
  // Accounting
  'manage_accounting', 'view_accounting',
];

async function main() {
  console.log('Start seeding ...');

  // --- Create Permissions ---
  console.log('Seeding permissions...');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm },
      update: {},
      create: { module: 'main', action: 'manage', key: perm },
    });
  }
  console.log('Permissions seeded.');

  // --- Create Superadmin Role ---
  let superadminRole = await prisma.role.findUnique({
    where: { name: 'superadmin' },
  });

  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        name: 'superadmin',
        isSystem: true,
      },
    });
    console.log('Created superadmin role.');
  } else {
    console.log('Superadmin role already exists.');
  }

  // --- Assign all permissions to Superadmin Role ---
  console.log('Assigning permissions to superadmin role...');
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superadminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superadminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log('Superadmin permissions assigned.');

  // --- Create Superadmin User ---
  const adminEmail = 'admin@khyatigems.com';
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('password', 10);
    adminUser = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'superadmin',
        roleId: superadminRole.id,
      },
    });
    console.log('Created superadmin user with password: password');
  } else {
    // Ensure existing user is linked to the superadmin role
    await prisma.user.update({
        where: { email: adminEmail },
        data: { roleId: superadminRole.id }
    });
    console.log('Superadmin user already exists. Ensured role is assigned.');
  }

  // --- Seed Expense Categories ---
  const categories = [
    { name: "Office Rent", code: "RENT", gstAllowed: true, status: "ACTIVE" },
    { name: "Salaries & Wages", code: "SALARY", gstAllowed: false, status: "ACTIVE" },
    { name: "Courier & Logistics", code: "LOGISTICS", gstAllowed: true, status: "ACTIVE" },
    { name: "Packaging & Materials", code: "PACKAGING", gstAllowed: true, status: "ACTIVE" },
    { name: "Marketing & Advertising", code: "MARKETING", gstAllowed: true, status: "ACTIVE" },
    { name: "Utilities", code: "UTILITIES", gstAllowed: true, status: "ACTIVE" },
    { name: "Software & Tools", code: "SOFTWARE", gstAllowed: true, status: "ACTIVE" },
    { name: "Repairs & Maintenance", code: "REPAIRS", gstAllowed: true, status: "ACTIVE" },
    { name: "Professional Fees", code: "PRO_FEES", gstAllowed: true, status: "ACTIVE" },
    { name: "Travel & Conveyance", code: "TRAVEL", gstAllowed: true, status: "ACTIVE" },
    { name: "Miscellaneous", code: "MISC", gstAllowed: true, status: "ACTIVE" },
  ];

  console.log("Seeding Expense Categories...");
  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: { 
        code: category.code,
        gstAllowed: category.gstAllowed,
        status: category.status,
      },
      create: category,
    });
  }
  console.log("Expense Categories seeded.");

  // --- Seed Marketplace Profiles ---
  const profiles = [
    { name: "SHOPIFY", displayName: "Shopify", currency: "USD", isDefault: false },
    { name: "ETSY", displayName: "Etsy", currency: "USD", isDefault: true },
    { name: "EBAY", displayName: "eBay", currency: "USD", isDefault: false },
    { name: "AMAZON", displayName: "Amazon", currency: "USD", isDefault: false },
    { name: "WEBSITE", displayName: "Website", currency: "INR", isDefault: false },
    { name: "WHOLESALE", displayName: "Wholesale", currency: "INR", isDefault: false },
    { name: "OFFLINE", displayName: "Offline Sales", currency: "INR", isDefault: false },
  ];

  console.log("Seeding Marketplace Profiles...");
  for (const profile of profiles) {
    await prisma.marketplaceProfile.upsert({
      where: { name: profile.name },
      update: { displayName: profile.displayName, currency: profile.currency },
      create: { ...profile, marginType: "PERCENT", marginValue: 0, isActive: true },
    });
  }
  console.log("Marketplace Profiles seeded.");

  // --- Seed Currency Rates ---
  const currencies = [
    { code: "INR", rateToInr: 1, isBase: true },
    { code: "USD", rateToInr: 0, isBase: false },
    { code: "EUR", rateToInr: 0, isBase: false },
    { code: "GBP", rateToInr: 0, isBase: false },
    { code: "AUD", rateToInr: 0, isBase: false },
    { code: "CAD", rateToInr: 0, isBase: false },
    { code: "SGD", rateToInr: 0, isBase: false },
    { code: "AED", rateToInr: 0, isBase: false },
    { code: "JPY", rateToInr: 0, isBase: false },
  ];

  console.log("Seeding Currency Rates...");
  for (const currency of currencies) {
    await prisma.currencyRate.upsert({
      where: { code: currency.code },
      update: { isBase: currency.isBase },
      create: currency,
    });
  }
  console.log("Currency Rates seeded.");

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
