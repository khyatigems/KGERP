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
            actionType: "EDIT", // Or custom action if supported, but EDIT/STATUS_CHANGE are standard. Maybe extend ActivityLog for PRINT?
            // The user requirement says "Printing action logged in Activity Log".
            // My activity-logger supports: CREATE, EDIT, DELETE, STATUS_CHANGE.
            // I should probably just use "EDIT" and put details in fieldChanges or add a new type if I could.
            // But I can't easily change the schema right now without risk.
            // I'll use "EDIT" and note it in fieldChanges or just log it as a generic action if I can.
            // Wait, I can pass custom "actionType" if I cast it, or I can just say it's an EDIT where "Label Printed" = "Yes".
            // Let's use "EDIT" and mock a change.
            oldData: { labelPrinted: "No" },
            newData: { labelPrinted: `Yes (${labelType})` },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to log label print:", error);
        return { success: false };
    }
}
