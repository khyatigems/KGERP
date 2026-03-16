import { prisma } from "@/lib/prisma";
import { setInventoryAttentionVisibility } from "@/lib/attention-visibility";
const prismaAny = prisma as any;

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const actor = { userId: "integration-test-user", userName: "Integration Test" };

  const existing = await prismaAny.inventory.findFirst({
    where: { status: "IN_STOCK" },
    select: { id: true, sku: true, hideFromAttention: true }
  });

  let inventoryId = existing?.id;
  let sku = existing?.sku;
  let originalHideState = existing?.hideFromAttention ?? false;
  let createdTemporary = false;

  if (!inventoryId || !sku) {
    const created = await prismaAny.inventory.create({
      data: {
        sku: `TESTATN${Date.now()}`,
        itemName: "Attention Visibility Test SKU",
        category: "Loose Gemstone",
        costPrice: 1,
        sellingPrice: 1,
        status: "IN_STOCK",
        hideFromAttention: false
      },
      select: { id: true, sku: true, hideFromAttention: true }
    });
    inventoryId = created.id;
    sku = created.sku;
    originalHideState = false;
    createdTemporary = true;
  }

  const hideResult = await setInventoryAttentionVisibility(inventoryId, true, actor);
  assert(hideResult.success, "Hiding SKU from attention should succeed");

  const hiddenState = await prismaAny.inventory.findUnique({
    where: { id: inventoryId },
    select: { hideFromAttention: true }
  });
  assert(hiddenState?.hideFromAttention === true, "Inventory hideFromAttention should be true after hide operation");

  const showResult = await setInventoryAttentionVisibility(inventoryId, false, actor);
  assert(showResult.success, "Showing SKU in attention should succeed");

  const visibleState = await prismaAny.inventory.findUnique({
    where: { id: inventoryId },
    select: { hideFromAttention: true }
  });
  assert(visibleState?.hideFromAttention === false, "Inventory hideFromAttention should be false after unhide operation");

  const latestLog = await prisma.activityLog.findFirst({
    where: {
      entityType: "Inventory",
      entityId: inventoryId,
      userId: actor.userId
    },
    orderBy: { createdAt: "desc" }
  });
  assert(Boolean(latestLog), "Activity log should be created for attention visibility changes");

  if (createdTemporary) {
    await prismaAny.inventory.delete({ where: { id: inventoryId } });
  } else {
    await prismaAny.inventory.update({
      where: { id: inventoryId },
      data: { hideFromAttention: originalHideState }
    });
  }

  console.log(`attention-visibility.integration.ts passed for ${sku}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
