"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";

// Helper to ensure singleton settings exist
async function getOrCreateSettings() {
  const settings = await prisma.landingPageSettings.findFirst({
    include: { slides: { orderBy: { displayOrder: 'asc' } } }
  });

  if (settings) return settings;

  // Create default if not exists
  // Note: system user ID is placeholder, usually we might use a known admin ID or null if optional
  // But schema says String, so we use "system"
  return prisma.landingPageSettings.create({
    data: {
      brandTitle: "KhyatiGems™ ERP",
      subtitle: "Internal Operations & Management Platform",
      accessNotice: "Authorized internal access only",
      slideshowEnabled: true,
      highlightsEnabled: true,
      whatsNewEnabled: false,
      highlights: JSON.stringify([]),
      activeVersion: 1,
      updatedByUserId: "system", 
    },
    include: { slides: true }
  });
}

export async function getLandingPageSettings() {
  const settings = await getOrCreateSettings();
  return {
    ...settings,
    highlights: JSON.parse(settings.highlights),
    slides: settings.slides
  };
}

export async function saveLandingPageSettings(data: {
  subtitle: string;
  accessNotice: string;
  slideshowEnabled: boolean;
  highlightsEnabled: boolean;
  whatsNewEnabled: boolean;
  highlights: string[];
  whatsNewText?: string;
  slides: {
    title: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }[];
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, PERMISSIONS.MANAGE_LANDING_PAGE)) {
    return { success: false, message: "Unauthorized" };
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
          slideshowEnabled: data.slideshowEnabled,
          highlightsEnabled: data.highlightsEnabled,
          whatsNewEnabled: data.whatsNewEnabled,
          highlights: JSON.stringify(data.highlights),
          whatsNewText: data.whatsNewText,
          whatsNewUpdatedAt: data.whatsNewText !== currentSettings.whatsNewText ? new Date() : currentSettings.whatsNewUpdatedAt,
          activeVersion: newVersionNumber,
          updatedByUserId: session.user.id,
        }
      });

      // 2. Update Slides (Delete all and recreate is safest for full sync)
      await tx.landingPageSlide.deleteMany({ where: { settingsId: currentSettings.id } });
      
      if (data.slides && data.slides.length > 0) {
        await tx.landingPageSlide.createMany({
            data: data.slides.map((s, idx) => ({
                settingsId: currentSettings.id,
                title: s.title,
                description: s.description,
                displayOrder: idx + 1,
                isActive: s.isActive
            }))
        });
      }

      // 3. Fetch full new state for snapshot
      const newState = await tx.landingPageSettings.findUnique({
        where: { id: currentSettings.id },
        include: { slides: { orderBy: { displayOrder: 'asc' } } }
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
      
      // 5. Audit Log
      // Note: We cannot pass tx to logActivity as it uses the global prisma client.
      // This means logging is outside the transaction, which is acceptable for non-critical logs.
      await logActivity({
        entityType: "LandingPage",
        entityId: currentSettings.id,
        entityIdentifier: "Settings",
        actionType: "EDIT",
        userId: session.user.id,
        userName: session.user.name,
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
  if (!session?.user || !hasPermission(session.user.role, PERMISSIONS.MANAGE_LANDING_PAGE)) {
    return [];
  }
  
  return prisma.landingPageVersion.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } }
  });
}

export async function rollbackVersion(versionId: string) {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user.role, PERMISSIONS.MANAGE_LANDING_PAGE)) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        const version = await prisma.landingPageVersion.findUnique({
            where: { id: versionId }
        });
        
        if (!version) return { success: false, message: "Version not found" };

        const snapshot = JSON.parse(version.snapshot);
        // Snapshot is the LandingPageSettings object with slides
        const settings = snapshot as any; 
        const slides = (settings.slides || []) as any[];

        const currentSettings = await getOrCreateSettings();
        const newVersionNumber = currentSettings.activeVersion + 1;

        await prisma.$transaction(async (tx) => {
            // Restore Settings
            await tx.landingPageSettings.update({
                where: { id: currentSettings.id },
                data: {
                    subtitle: settings.subtitle,
                    accessNotice: settings.accessNotice,
                    slideshowEnabled: settings.slideshowEnabled,
                    highlightsEnabled: settings.highlightsEnabled,
                    whatsNewEnabled: settings.whatsNewEnabled,
                    highlights: settings.highlights,
                    whatsNewText: settings.whatsNewText,
                    activeVersion: newVersionNumber,
                    updatedByUserId: session.user.id,
                }
            });

            // Restore Slides
            await tx.landingPageSlide.deleteMany({ where: { settingsId: currentSettings.id } });
            if (slides.length > 0) {
                await tx.landingPageSlide.createMany({
                    data: slides.map((s) => ({
                        settingsId: currentSettings.id,
                        title: s.title,
                        description: s.description,
                        displayOrder: s.displayOrder,
                        isActive: s.isActive
                    }))
                });
            }

            // Create Rollback Version Entry
             const newState = await tx.landingPageSettings.findUnique({
                where: { id: currentSettings.id },
                include: { slides: { orderBy: { displayOrder: 'asc' } } }
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
            await logActivity(tx, {
                entityType: "LandingPage",
                entityId: currentSettings.id,
                entityIdentifier: "Settings",
                actionType: "ROLLBACK",
                userId: session.user.id,
                userName: session.user.name,
                userEmail: session.user.email,
                source: "WEB",
                fieldChanges: JSON.stringify({ restoredVersion: version.versionNumber, newVersion: newVersionNumber })
            });
        });

        revalidatePath("/login");
        revalidatePath("/settings/landing-page");
        return { success: true };

    } catch (error) {
        console.error("Rollback failed:", error);
        return { success: false, message: "Rollback failed" };
    }
}
