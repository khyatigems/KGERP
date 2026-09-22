"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { sendCertificateEmailForInventory } from "@/lib/email/order-email-flow";

export async function emailCertificateForInventoryAction(inventoryId: string) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  const enabled = await getFeatureFlag(FEATURE_FLAG_KEYS.emailEngine);
  if (!enabled) return { success: false, message: "Email engine is disabled" };

  const result = await sendCertificateEmailForInventory(inventoryId);
  revalidatePath(`/inventory/${inventoryId}`);
  return result;
}
