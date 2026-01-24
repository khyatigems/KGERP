import { auth } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";

export type PermissionCheckResult = {
  success: boolean;
  message?: string;
};

export const UNAUTHORIZED_MESSAGE = "Your credentials don't have permission to perform this action. Please contact IT Support for permission.";

export async function checkPermission(permission: Permission): Promise<PermissionCheckResult> {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  
  if (hasPermission(role, permission)) {
    return { success: true };
  }
  
  // Log denial
  await logActivity({
    entityType: "Security",
    entityId: session?.user?.id || "unknown",
    entityIdentifier: session?.user?.email || "unknown",
    actionType: "ACCESS_DENIED",
    source: "WEB",
    userId: session?.user?.id,
    userName: session?.user?.name || undefined,
    fieldChanges: `Attempted action requiring permission: ${permission}`
  });
  
  return { 
    success: false, 
    message: UNAUTHORIZED_MESSAGE
  };
}
