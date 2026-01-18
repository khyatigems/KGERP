import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type ActionType = "CREATE" | "EDIT" | "DELETE" | "STATUS_CHANGE";
export type EntityType = "Inventory" | "Purchase" | "Sale" | "Quotation" | "Invoice" | "Vendor" | "Listing" | "User";

interface LogActivityParams {
  entityType: EntityType;
  entityId: string;
  entityIdentifier: string;
  actionType: ActionType;
  oldData?: any;
  newData?: any;
  userId?: string; // Optional override, otherwise uses session
  userName?: string; // Optional override
  source?: "WEB" | "SYSTEM" | "CRON" | "CSV_IMPORT";
}

export async function logActivity({
  entityType,
  entityId,
  entityIdentifier,
  actionType,
  oldData,
  newData,
  userId,
  userName,
  source = "WEB",
}: LogActivityParams) {
  try {
    let finalUserId = userId;
    let finalUserName = userName;
    let finalUserEmail = "";

    // If no user provided and source is WEB, try to get from session
    if (!finalUserId && source === "WEB") {
      const session = await auth();
      if (session?.user) {
        finalUserId = session.user.id;
        finalUserName = session.user.name || session.user.email;
        finalUserEmail = session.user.email || "";
      }
    }

    // If still no user and source is SYSTEM/CRON, use system user
    if (!finalUserId && (source === "SYSTEM" || source === "CRON")) {
       finalUserId = "SYSTEM";
       finalUserName = "System";
    }

    // Fallback
    if (!finalUserId) {
        finalUserId = "UNKNOWN";
        finalUserName = "Unknown";
    }

    // Calculate field changes if it's an EDIT
    let fieldChanges = null;
    if (actionType === "EDIT" && oldData && newData) {
      const changes: Record<string, { old: any; new: any }> = {};
      
      // Get all keys from both objects
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      allKeys.forEach(key => {
        const oldVal = oldData[key];
        const newVal = newData[key];
        
        // Skip metadata fields
        if (key === 'updatedAt' || key === 'createdAt' || key === 'createdBy') return;

        // Simple equality check
        // For objects/dates, we might need better comparison, but JSON.stringify covers most simple cases
        // Handling Dates specifically if needed, but JSON.stringify handles ISO strings usually
        
        const strOld = JSON.stringify(oldVal);
        const strNew = JSON.stringify(newVal);

        if (strOld !== strNew) {
            changes[key] = { old: oldVal, new: newVal };
        }
      });
      
      if (Object.keys(changes).length > 0) {
        fieldChanges = JSON.stringify(changes);
      } else {
        // No meaningful changes detected
        // We might still want to log that an "Edit" happened even if nothing changed? 
        // Or maybe skip it? Requirement says "Log every meaningful action". 
        // If no fields changed, maybe it's not meaningful.
        // But let's log it anyway without changes if specifically requested as EDIT.
      }
    }

    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        entityIdentifier,
        actionType,
        fieldChanges,
        userId: finalUserId,
        userName: finalUserName,
        userEmail: finalUserEmail,
        source,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Do not block the main flow
  }
}
