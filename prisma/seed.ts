import { PrismaClient } from "@prisma/client-custom-v2";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Office Rent", code: "RENT", gstAllowed: true },
    { name: "Salaries & Wages", code: "SALARY", gstAllowed: false },
    { name: "Courier & Logistics", code: "LOGISTICS", gstAllowed: true },
    { name: "Packaging & Materials", code: "PACKAGING", gstAllowed: true },
    { name: "Marketing & Advertising", code: "MARKETING", gstAllowed: true },
    { name: "Utilities", code: "UTILITIES", gstAllowed: true },
    { name: "Software & Tools", code: "SOFTWARE", gstAllowed: true },
    { name: "Repairs & Maintenance", code: "REPAIRS", gstAllowed: true },
    { name: "Professional Fees", code: "PRO_FEES", gstAllowed: true },
    { name: "Travel & Conveyance", code: "TRAVEL", gstAllowed: true },
    { name: "Miscellaneous", code: "MISC", gstAllowed: true },
  ];

  console.log("Seeding Expense Categories...");

  for (const category of categories) {
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.expenseCategory.create({
        data: {
          name: category.name,
          code: category.code,
          gstAllowed: category.gstAllowed,
          status: "ACTIVE",
        },
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
  }

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
