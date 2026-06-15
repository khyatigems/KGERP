"use server";

import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { prisma } from "@/lib/prisma";

export async function logLabelPrint(inventoryId: string, labelType: string) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const inventory = await prisma.inventory.findUnique({
            where: { id: inventoryId },
            select: { sku: true }
        });

        if (!inventory) return { success: false, message: "Inventory not found" };

        await logActivity({
            entityType: "Inventory",
            entityId: inventoryId,
            entityIdentifier: inventory.sku,
            actionType: "EDIT",
            details: `Label printed for this item (${labelType})`,
            oldData: { labelPrinted: "No" },
            newData: { labelPrinted: `Yes (${labelType})` },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to log label print:", error);
        return { success: false };
    }
}
