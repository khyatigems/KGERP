import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // 1. Admin User
  const password = await hash("admin123", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@khyatigems.com" },
    update: {},
    create: {
      email: "admin@khyatigems.com",
      name: "Super Admin",
      password,
      role: "ADMIN"
    }
  });
  
  console.log("Admin user seeded:", admin.email);
  
  // 2. Settings
  const settings = [
    { key: "company_name", value: "Khyati Precious Gems Pvt. Ltd." },
    { key: "company_phone", value: "+919915270295" },
    { key: "company_email", value: "support@khyatigems.com" },
    { key: "upi_vpa", value: "9915270295@okbizaxis" },
    { key: "upi_payee_name", value: "Khyati Gems" },
    { key: "bank_name", value: "RBL Bank" },
    { key: "bank_account", value: "409002043174" },
    { key: "bank_ifsc", value: "RATN0000145" },
    { key: "invoice_prefix", value: "KG" },
    { key: "quotation_prefix", value: "KGQ" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  
  console.log("Settings seeded");
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
