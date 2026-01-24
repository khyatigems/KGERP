import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type ActionType = "CREATE" | "EDIT" | "DELETE" | "STATUS_CHANGE" | "ROLLBACK" | "ACCESS_DENIED" | "LOGIN";
export type EntityType =
  | "Inventory"
  | "Purchase"
  | "Sale"
  | "Quotation"
  | "Invoice"
  | "Vendor"
  | "Listing"
  | "User"
  | "Code"
  | "LandingPage"
  | "Security";

interface LogActivityParams<T = Record<string, unknown>> {
  entityType: EntityType;
  entityId: string;
  entityIdentifier: string;
  actionType: ActionType;
  oldData?: T;
  newData?: T;
  fieldChanges?: string; // Allow explicit override
  userId?: string; // Optional override, otherwise uses session
  userName?: string; // Optional override
  source?: "WEB" | "SYSTEM" | "CRON" | "CSV_IMPORT";
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity<T = Record<string, unknown>>({
  entityType,
  entityId,
  entityIdentifier,
  actionType,
  oldData,
  newData,
  fieldChanges: explicitFieldChanges,
  userId,
  userName,
  source = "WEB",
  ipAddress,
  userAgent,
}: LogActivityParams<T>) {
  try {
    let finalUserId = userId;
    let finalUserName = userName;
    let finalUserEmail = "";
    let finalIpAddress = ipAddress;
    let finalUserAgent = userAgent;

    // Try to get headers if IP/UA not provided
    if (!finalIpAddress || !finalUserAgent) {
        try {
            const headersList = await headers();
            if (!finalIpAddress) {
                const forwardedFor = headersList.get("x-forwarded-for");
                finalIpAddress = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
            }
            if (!finalUserAgent) {
                finalUserAgent = headersList.get("user-agent") || "Unknown";
            }
        } catch {
            // Context might not have headers (e.g. CRON or background job)
            if (!finalIpAddress) finalIpAddress = "127.0.0.1";
            if (!finalUserAgent) finalUserAgent = "System/Background";
        }
    }

    // If no user provided and source is WEB, try to get from session
    if (!finalUserId && source === "WEB") {
      const session = await auth();
      if (session?.user) {
        finalUserId = session.user.id;
        finalUserName = session.user.name || session.user.email || "Unknown";
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
    let fieldChanges = explicitFieldChanges || null;
    if (!fieldChanges && actionType === "EDIT" && oldData && newData) {
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      
      // Get all keys from both objects
      // We cast to Record<string, unknown> to access keys safely if T is not specific enough
      const oldObj = oldData as Record<string, unknown>;
      const newObj = newData as Record<string, unknown>;

      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      allKeys.forEach(key => {
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        
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
        ipAddress: finalIpAddress,
        userAgent: finalUserAgent,
        source,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Do not block the main flow
  }
}
