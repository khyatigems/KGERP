import { auth } from "@/lib/auth";
import { checkUserPermission, Permission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";
import type { Session } from "next-auth";

export type PermissionCheckResult = {
  success: boolean;
  message?: string;
  session?: Session;
};

export const UNAUTHORIZED_MESSAGE = "Your credentials don't have permission to perform this action. Please contact IT Support for permission.";

export async function checkPermission(permission: Permission): Promise<PermissionCheckResult> {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) {
    return { success: false, message: "Not authenticated" };
  }

  const hasPerm = await checkUserPermission(userId, permission);
  
  if (hasPerm) {
    return { success: true, session };
  }
  
  // Log denial
  await logActivity({
    entityType: "Security",
    entityId: userId,
    entityIdentifier: session?.user?.email || "unknown",
    actionType: "ACCESS_DENIED",
    source: "WEB",
    userId: userId,
    userName: session?.user?.name || undefined,
    fieldChanges: `Attempted action requiring permission: ${permission}`
  });
  
  return { 
    success: false, 
    message: UNAUTHORIZED_MESSAGE
  };
}
