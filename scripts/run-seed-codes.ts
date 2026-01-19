import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(process.cwd(), "prisma", "seed-codes.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Found ${statements.length} statements.`);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log("Executed statement.");
    } catch (e) {
      console.error("Error executing statement:", e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
