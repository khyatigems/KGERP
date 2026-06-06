"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveMarketplaceConflict } from "@/lib/marketplace-control-center";

export async function markMarketplaceConflictResolved(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return;

  const conflictId = String(formData.get("conflictId") || "").trim();
  if (!conflictId) return;

  await resolveMarketplaceConflict({
    conflictId,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    note: String(formData.get("note") || "").trim() || undefined,
  });

  revalidatePath("/marketplace-conflicts");
  revalidatePath("/marketplace-control-center");
}
