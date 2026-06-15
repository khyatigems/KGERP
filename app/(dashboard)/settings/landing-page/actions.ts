"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { LandingPageSettings } from "@prisma/client";

// Helper to ensure singleton settings exist
async function getOrCreateSettings() {
  const settings = await prisma.landingPageSettings.findFirst();

  if (settings) return settings;

  return prisma.landingPageSettings.create({
    data: {
      brandTitle: "KhyatiGems™ ERP",
      subtitle: "Internal Operations & Management Platform",
      accessNotice: "Authorized internal access only",
      highlightsEnabled: true,
      whatsNewEnabled: false,
      highlights: JSON.stringify([]),
      activeVersion: 1,
      updatedByUserId: "system", 
    },
  });
}

export async function getLandingPageSettings() {
  const settings = await getOrCreateSettings();
  return {
    ...settings,
    highlights: JSON.parse(settings.highlights),
  };
}

export async function saveLandingPageSettings(data: {
  subtitle: string;
  accessNotice: string;
  highlightsEnabled: boolean;
  whatsNewEnabled: boolean;
  highlights: string[];
  whatsNewText?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_LANDING_PAGE);
  if (!perm.success) return { success: false, message: perm.message };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized: No user session" };
  }

  // Verify user exists in database to prevent Foreign Key errors
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  });

  if (!userExists) {
    return { success: false, message: "User record not found. Please try logging out and back in." };
  }

  try {
    const currentSettings = await getOrCreateSettings();
    const newVersionNumber = currentSettings.activeVersion + 1;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Settings
      await tx.landingPageSettings.update({
        where: { id: currentSettings.id },
        data: {
          subtitle: data.subtitle,
          accessNotice: data.accessNotice,
          highlightsEnabled: data.highlightsEnabled,
          whatsNewEnabled: data.whatsNewEnabled,
          highlights: JSON.stringify(data.highlights),
          whatsNewText: data.whatsNewText,
          whatsNewUpdatedAt: data.whatsNewText !== currentSettings.whatsNewText ? new Date() : currentSettings.whatsNewUpdatedAt,
          activeVersion: newVersionNumber,
          updatedByUserId: session.user.id,
        }
      });

      const newState = await tx.landingPageSettings.findUnique({
        where: { id: currentSettings.id },
      });

      if (!newState) throw new Error("Failed to retrieve new state");

      // 4. Create Version Record
      await tx.landingPageVersion.create({
        data: {
            versionNumber: newVersionNumber,
            snapshot: JSON.stringify(newState),
            createdByUserId: session.user.id,
            isRollback: false
        }
      });
      
      // Audit Log
      // Note: We cannot pass tx to logActivity as it uses the global prisma client.
      // This means logging is outside the transaction, which is acceptable for non-critical logs.
      await logActivity({
        entityType: "LandingPage",
        entityId: currentSettings.id,
        entityIdentifier: "Settings",
        actionType: "EDIT",
        userId: session.user.id,
        userName: session.user.name ?? undefined,
        // userEmail: session.user.email, // Not in the interface, check if needed or inferred
        source: "WEB",
        // fieldChanges: JSON.stringify({ version: newVersionNumber }) // handled by oldData/newData if passed, or we skip
        // passing explicit data for simple version log
        newData: { version: newVersionNumber }
      });

      return newState;
    });

    revalidatePath("/login");
    revalidatePath("/settings/landing-page");
    return { success: true, data: result };

  } catch (error) {
    console.error("Failed to save landing page settings:", error);
    return { success: false, message: "Failed to save settings" };
  }
}

export async function getVersions() {
  const session = await auth();
  if (!session?.user?.id || !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_LANDING_PAGE))) {
    return [];
  }
  
  return prisma.landingPageVersion.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } }
  });
}

export async function rollbackVersion(versionId: string) {
    const session = await auth();
    if (!session?.user?.id || !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_LANDING_PAGE))) {
        return { success: false, message: "Unauthorized" };
    }

    // Verify user exists to prevent FK errors
    const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true }
    });

    if (!userExists) {
        return { success: false, message: "User record not found. Please re-login." };
    }

    try {
        const version = await prisma.landingPageVersion.findUnique({
            where: { id: versionId }
        });
        
        if (!version) return { success: false, message: "Version not found" };

        const snapshot = JSON.parse(version.snapshot);
        const settings = snapshot as LandingPageSettings;

        const currentSettings = await getOrCreateSettings();
        const newVersionNumber = currentSettings.activeVersion + 1;

        await prisma.$transaction(async (tx) => {
            await tx.landingPageSettings.update({
                where: { id: currentSettings.id },
                data: {
                    subtitle: settings.subtitle,
                    accessNotice: settings.accessNotice,
                    highlightsEnabled: settings.highlightsEnabled,
                    whatsNewEnabled: settings.whatsNewEnabled,
                    highlights: settings.highlights,
                    whatsNewText: settings.whatsNewText,
                    activeVersion: newVersionNumber,
                    updatedByUserId: session.user.id,
                }
            });

            const newState = await tx.landingPageSettings.findUnique({
                where: { id: currentSettings.id },
            });

            if (!newState) throw new Error("Failed to retrieve restored state");

            await tx.landingPageVersion.create({
                data: {
                    versionNumber: newVersionNumber,
                    snapshot: JSON.stringify(newState),
                    createdByUserId: session.user.id,
                    isRollback: true
                }
            });

            // Audit Log
            await logActivity({
                entityType: "LandingPage",
                entityId: currentSettings.id,
                entityIdentifier: "Settings",
                actionType: "ROLLBACK",
                userId: session.user.id,
                userName: session.user.name ?? undefined,
                source: "WEB",
                fieldChanges: JSON.stringify({ restoredVersion: version.versionNumber, newVersion: newVersionNumber })
            });
        });

        revalidatePath("/login");
        revalidatePath("/settings/landing-page");
        return { success: true };

    } catch (error) {
        console.error("Rollback failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, message: `Rollback failed: ${errorMessage}` };
    }
}

export async function addWhatsNewEntry(message: string) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_LANDING_PAGE);
  if (!perm.success) return { success: false, message: perm.message };

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WhatsNewEntry" (id, message, "createdAt", "updatedAt") VALUES (?, ?, datetime('now'), datetime('now'))`,
      crypto.randomUUID(), message
    );
    revalidatePath("/login");
    return { success: true };
  } catch (error) {
    console.error("Failed to add whats new entry:", error);
    return { success: false, message: "Failed to add entry" };
  }
}

export async function getWhatsNewEntries() {
  try {
    const entries = await prisma.$queryRawUnsafe<Array<{ id: string; message: string; createdAt: string }>>(
      `SELECT id, message, "createdAt" FROM "WhatsNewEntry" ORDER BY "createdAt" DESC LIMIT 5`
    );
    return entries.map((e) => ({ ...e, createdAt: new Date(e.createdAt) }));
  } catch {
    return [];
  }
}

export async function deleteWhatsNewEntry(id: string) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_LANDING_PAGE);
  if (!perm.success) return { success: false, message: perm.message };

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "WhatsNewEntry" WHERE id = ?`,
      id
    );
    revalidatePath("/login");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete whats new entry:", error);
    return { success: false, message: "Failed to delete entry" };
  }
}
