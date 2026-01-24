
import { prisma } from "../lib/prisma";

async function checkUser() {
  const email = "abc@gmail.com";
  console.log(`Checking user: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true }
  });

  if (user) {
    console.log("User found:", user);
  } else {
    console.log("User not found.");
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
