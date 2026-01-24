
import { prisma } from "../lib/prisma";
import { compare } from "bcryptjs";

async function main() {
  const email = "admin@khyatigems.com";
  console.log(`Verifying user: ${email} in database...`);
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error("User NOT found in database!");
    process.exit(1);
  }

  console.log("User found:", user.id, user.role);
  console.log("Password hash:", user.password);

  const isValid = await compare("admin123", user.password);
  console.log("Password 'admin123' match:", isValid);
  
  if (isValid) {
    console.log("VERIFICATION SUCCESSFUL: Credentials are valid in the local database.");
  } else {
    console.error("VERIFICATION FAILED: Password mismatch.");
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
