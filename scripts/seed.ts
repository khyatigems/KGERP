import { hash, compare } from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPathDefault = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};

for (const p of [envPathDefault, envPathLocal]) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        const key = match[1].trim();
        envVars[key] = value;
      }
    });
  }
}

for (const [key, value] of Object.entries(envVars)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

async function main() {
  const { prisma } = await import("../lib/prisma");
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
      role: "SUPER_ADMIN"
    }
  });
  
  console.log("Admin user seeded:", admin.email);
  const loginCheckUser = await prisma.user.findUnique({
    where: { email: "admin@khyatigems.com" },
  });
  if (loginCheckUser) {
    const ok = await compare("admin123", loginCheckUser.password);
    console.log("Seed login verification for admin@khyatigems.com:", ok);
  } else {
    console.log("Seed login verification: user not found");
  }
  
  // 2. Settings
  const settings = [
    { key: "company_name", value: "Khyati Precious Gems Pvt. Ltd." },
    { key: "company_phone", value: "+919915270295" },
    { key: "company_email", value: "support@khyatigems.com" },
    { key: "upi_vpa", value: "9915270295@okbizaxis" },
    { key: "upi_payee_name", value: "KhyatiGems™" },
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

  const categoryCodes = [
    { code: "LG", name: "Loose Gemstone" },
    { code: "BR", name: "Bracelet" },
    { code: "RG", name: "Ring" },
    { code: "PD", name: "Pendant" },
    { code: "FD", name: "Figure / Idol" },
    { code: "SC", name: "Seven Chakra" },
    { code: "CP", name: "Chips" },
    { code: "BD", name: "Beads" },
    { code: "ML", name: "Mixed Lot" },
    { code: "RR", name: "Raw / Rough" },
    { code: "OT", name: "Other" },
  ];

  for (const c of categoryCodes) {
    await prisma.categoryCode.upsert({
      where: { code: c.code },
      update: { name: c.name, status: "ACTIVE" },
      create: { code: c.code, name: c.name, status: "ACTIVE" },
    });
  }

  const gemstoneCodes = [
    { code: "RBY", name: "Ruby" },
    { code: "BSP", name: "Blue Sapphire" },
    { code: "YSP", name: "Yellow Sapphire" },
    { code: "ESP", name: "Emerald" },
    { code: "DMN", name: "Diamond" },
    { code: "CZN", name: "Citrine" },
    { code: "GNT", name: "Garnet" },
    { code: "AMT", name: "Amethyst" },
    { code: "TCZ", name: "Topaz" },
    { code: "TOM", name: "Tourmaline" },
    { code: "OPL", name: "Opal" },
    { code: "PER", name: "Peridot" },
    { code: "MLT", name: "Mixed / Parcel" },
  ];

  for (const g of gemstoneCodes) {
    await prisma.gemstoneCode.upsert({
      where: { code: g.code },
      update: { name: g.name, status: "ACTIVE" },
      create: { code: g.code, name: g.name, status: "ACTIVE" },
    });
  }

  const colorCodes = [
    { code: "BLU", name: "Blue" },
    { code: "GRN", name: "Green" },
    { code: "YEL", name: "Yellow" },
    { code: "RED", name: "Red" },
    { code: "PNK", name: "Pink" },
    { code: "ORG", name: "Orange" },
    { code: "WHT", name: "White / Colorless" },
    { code: "BLK", name: "Black" },
    { code: "BRN", name: "Brown" },
    { code: "GRY", name: "Grey" },
    { code: "MLC", name: "Multi Color" },
    { code: "CLR", name: "Change Color" },
  ];

  for (const c of colorCodes) {
    await prisma.colorCode.upsert({
      where: { code: c.code },
      update: { name: c.name, status: "ACTIVE" },
      create: { code: c.code, name: c.name, status: "ACTIVE" },
    });
  }

  console.log("Settings and code masters seeded");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
