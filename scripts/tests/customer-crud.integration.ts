import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";

async function run() {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `test-${unique}@example.com`;

  const created = await prisma.customer.create({
    data: {
      name: `Test Customer ${unique}`,
      email,
      phone: "+919911111111",
      phoneSecondary: "+919922222222",
      address: "Test Address",
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      pincode: "244001",
    } as unknown as never,
  });

  const fetched = await prisma.customer.findUnique({ where: { id: created.id } });
  assert(fetched, "Customer must exist");
  assert.equal((fetched as unknown as { phoneSecondary?: string | null }).phoneSecondary, "+919922222222");

  await prisma.customer.update({
    where: { id: created.id },
    data: { phoneSecondary: "+919933333333" } as unknown as never,
  });

  const updated = await prisma.customer.findUnique({ where: { id: created.id } });
  assert(updated, "Customer must exist after update");
  assert.equal((updated as unknown as { phoneSecondary?: string | null }).phoneSecondary, "+919933333333");

  await prisma.customer.delete({ where: { id: created.id } });

  console.log("customer-crud.integration.ts passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
