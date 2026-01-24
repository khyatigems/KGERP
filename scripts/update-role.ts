
import { prisma } from "../lib/prisma";

async function main() {
  const email = "admin@khyatigems.com";
  console.log(`Updating user role for: ${email}...`);
  
  await prisma.user.update({
    where: { email },
    data: { role: "SUPER_ADMIN" }
  });

  console.log("User role updated to SUPER_ADMIN");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
