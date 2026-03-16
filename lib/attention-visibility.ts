import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
const prismaAny = prisma as any;

type AttentionVisibilityActor = {
  userId?: string;
  userName?: string;
};

export async function getInventoryAttentionVisibility(inventoryId: string) {
  return prismaAny.inventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      sku: true,
      hideFromAttention: true
    }
  });
}

export async function setInventoryAttentionVisibility(
  inventoryId: string,
  hideFromAttention: boolean,
  actor: AttentionVisibilityActor
) {
  const inventory = await prismaAny.inventory.findUnique({
    
    where: { id: inventoryId },
    select: {
      id: true,
      sku: true,
      hideFromAttention: true
    }
  });

  if (!inventory) {
    return {
      success: false as const,
      code: "NOT_FOUND" as const,
      message: "Inventory SKU not found"
    };
  }

  if (inventory.hideFromAttention === hideFromAttention) {
    return {
      success: true as const,
      updated: false as const,
      data: inventory
    };
  }

  const updated = await prismaAny.inventory.update({
    where: { id: inventoryId },
    data: { hideFromAttention },
    select: {
      id: true,
      sku: true,
      hideFromAttention: true
    }
  });

  await logActivity({
    entityType: "Inventory",
    entityId: inventory.id,
    entityIdentifier: inventory.sku,
    actionType: "EDIT",
    oldData: { hideFromAttention: inventory.hideFromAttention },
    newData: { hideFromAttention: updated.hideFromAttention },
    userId: actor.userId,
    userName: actor.userName,
    details: hideFromAttention
      ? `SKU ${inventory.sku} hidden from attention widget`
      : `SKU ${inventory.sku} restored in attention widget`
  });

  return {
    success: true as const,
    updated: true as const,
    data: updated
  };
}
