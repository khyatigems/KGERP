"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import type { LandingPageSettings, Prisma, WhatsNewEntry } from "@prisma/client";

type LandingPageSnapshot = {
  settings: LandingPageSettings;
  whatsNewEntries: Pick<WhatsNewEntry, "id" | "message" | "createdAt" | "updatedAt">[];
};

function parseLandingPageSnapshot(snapshot: string): {
  settings: LandingPageSettings;
  whatsNewEntries?: LandingPageSnapshot["whatsNewEntries"];
} {
  const parsed: unknown = JSON.parse(snapshot);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Landing page version snapshot is invalid");
  }

  const record = parsed as Record<string, unknown>;
  if ("settings" in record) {
    if (!record.settings || typeof record.settings !== "object" || Array.isArray(record.settings)) {
      throw new Error("Landing page version settings are invalid");
    }
    if (!Array.isArray(record.whatsNewEntries)) {
      throw new Error("Landing page version What's New entries are invalid");
    }
    return {
      settings: record.settings as LandingPageSettings,
      whatsNewEntries: record.whatsNewEntries as LandingPageSnapshot["whatsNewEntries"],
    };
  }

  // Support versions written before What's New entries were included in snapshots.
  return { settings: record as unknown as LandingPageSettings };
}

async function createVersionRecord(
  tx: Prisma.TransactionClient,
  createdByUserId: string,
  isRollback = false,
) {
  const settings = await tx.landingPageSettings.findFirst();
  if (!settings) throw new Error("Landing page settings were not found");

  const whatsNewEntries = await tx.whatsNewEntry.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const snapshot: LandingPageSnapshot = { settings, whatsNewEntries };

  await tx.landingPageVersion.create({
    data: {
      versionNumber: settings.activeVersion,
      snapshot: JSON.stringify(snapshot),
      createdByUserId,
      isRollback,
    },
  });
}

async function ensureCurrentVersionRecorded(tx: Prisma.TransactionClient, createdByUserId: string) {
  const settings = await tx.landingPageSettings.findFirst();
  if (!settings) throw new Error("Landing page settings were not found");

  const currentVersion = await tx.landingPageVersion.findFirst({
    where: { versionNumber: settings.activeVersion },
    select: { id: true },
  });
  if (!currentVersion) await createVersionRecord(tx, createdByUserId);
}

async function getSettingsEditor() {
  const permission = await checkPermission(PERMISSIONS.SETTINGS_LANDING_PAGE);
  if (!permission.success) return { error: permission.message } as const;

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized: No user session" } as const;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) return { error: "User record not found. Please try logging out and back in." } as const;

  return { userId: user.id } as const;
}

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
  const editor = await getSettingsEditor();
  if ("error" in editor) return { success: false, message: editor.error };

  try {
    const currentSettings = await getOrCreateSettings();

    const result = await prisma.$transaction(async (tx) => {
      await ensureCurrentVersionRecorded(tx, editor.userId);
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
          activeVersion: { increment: 1 },
          updatedByUserId: editor.userId,
        }
      });

      const newState = await tx.landingPageSettings.findUnique({
        where: { id: currentSettings.id },
      });
      if (!newState) throw new Error("Failed to retrieve new state");

      await createVersionRecord(tx, editor.userId);
      return newState;
    });

    await logActivity({
      entityType: "LandingPage",
      entityId: currentSettings.id,
      entityIdentifier: "Login page content",
      actionType: "EDIT",
      userId: editor.userId,
      userName: undefined,
      source: "WEB",
      description: "Updated ERP login page content",
      newData: { version: result.activeVersion },
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
    const editor = await getSettingsEditor();
    if ("error" in editor) return { success: false, message: editor.error };

    try {
        const version = await prisma.landingPageVersion.findUnique({
            where: { id: versionId }
        });
        
        if (!version) return { success: false, message: "Version not found" };

        const snapshot = parseLandingPageSnapshot(version.snapshot);
        const settings = snapshot.settings;

        const currentSettings = await getOrCreateSettings();

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
                    whatsNewUpdatedAt: settings.whatsNewUpdatedAt,
                    activeVersion: { increment: 1 },
                    updatedByUserId: editor.userId,
                }
            });

            if (snapshot.whatsNewEntries) {
              await tx.whatsNewEntry.deleteMany();
              if (snapshot.whatsNewEntries.length > 0) {
                await tx.whatsNewEntry.createMany({
                  data: snapshot.whatsNewEntries.map((entry) => ({
                    id: entry.id,
                    message: entry.message,
                    createdAt: new Date(entry.createdAt),
                    updatedAt: new Date(entry.updatedAt),
                  })),
                });
              }
            }
            await createVersionRecord(tx, editor.userId, true);
        });

        const restoredSettings = await prisma.landingPageSettings.findUnique({
          where: { id: currentSettings.id },
          select: { activeVersion: true },
        });
        await logActivity({
            entityType: "LandingPage",
            entityId: currentSettings.id,
            entityIdentifier: "Login page content",
            actionType: "ROLLBACK",
            userId: editor.userId,
            source: "WEB",
            description: `Restored login page version ${version.versionNumber}`,
            fieldChanges: JSON.stringify({ restoredVersion: version.versionNumber, newVersion: restoredSettings?.activeVersion })
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
  const editor = await getSettingsEditor();
  if ("error" in editor) return { success: false, message: editor.error };
  const trimmedMessage = message.trim();
  if (!trimmedMessage || trimmedMessage.length > 240 || /<[^>]*>/.test(trimmedMessage)) {
    return { success: false, message: "Enter a plain-text update of up to 240 characters." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureCurrentVersionRecorded(tx, editor.userId);
      await tx.whatsNewEntry.create({ data: { message: trimmedMessage } });
      const settings = await tx.landingPageSettings.findFirst();
      if (!settings) throw new Error("Landing page settings were not found");
      await tx.landingPageSettings.update({
        where: { id: settings.id },
        data: { activeVersion: { increment: 1 }, updatedByUserId: editor.userId },
      });
      await createVersionRecord(tx, editor.userId);
    });
    await logActivity({
      entityType: "LandingPage",
      actionType: "EDIT",
      userId: editor.userId,
      source: "WEB",
      description: "Added a What's New update",
    });
    revalidatePath("/login");
    revalidatePath("/settings/landing-page");
    return { success: true };
  } catch (error) {
    console.error("Failed to add whats new entry:", error);
    return { success: false, message: "Failed to add entry" };
  }
}

export async function getWhatsNewEntries() {
  return prisma.whatsNewEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function deleteWhatsNewEntry(id: string) {
  const editor = await getSettingsEditor();
  if ("error" in editor) return { success: false, message: editor.error };

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.whatsNewEntry.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return false;

      await ensureCurrentVersionRecorded(tx, editor.userId);
      await tx.whatsNewEntry.delete({ where: { id } });
      const settings = await tx.landingPageSettings.findFirst();
      if (!settings) throw new Error("Landing page settings were not found");
      await tx.landingPageSettings.update({
        where: { id: settings.id },
        data: { activeVersion: { increment: 1 }, updatedByUserId: editor.userId },
      });
      await createVersionRecord(tx, editor.userId);
      return true;
    });
    if (!deleted) return { success: false, message: "What's New entry was not found." };
    await logActivity({
      entityType: "LandingPage",
      actionType: "EDIT",
      userId: editor.userId,
      source: "WEB",
      description: "Removed a What's New update",
    });
    revalidatePath("/login");
    revalidatePath("/settings/landing-page");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete whats new entry:", error);
    return { success: false, message: "Failed to delete entry" };
  }
}

export async function generateWhatsNewDraft() {
  const editor = await getSettingsEditor();
  if ("error" in editor) return { success: false as const, message: editor.error };

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const activity = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: since },
      actionType: { notIn: ["LOGIN", "LOGOUT", "PUBLIC_VIEW", "QR_SCAN", "UNKNOWN"] },
      module: { not: "LandingPage" },
    },
    select: { module: true, entityType: true, actionType: true, action: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const categories = new Map<string, number>();
  for (const event of activity) {
    const action = (event.action || event.actionType || "").toLowerCase();
    const area = `${event.module || ""} ${event.entityType || ""}`.toLowerCase();
    let category: string | null = null;

    if (action === "inbox.sync" || area.includes("marketplace")) category = "marketplace sync";
    else if (area.includes("invoice") || area.includes("payment")) category = "invoicing";
    else if (/inventory|gemstone|product|stone/.test(area)) category = "gem inventory";
    else if (area.includes("sale") || area.includes("order")) category = "sales";
    else if (area.includes("purchase")) category = "purchasing";
    else if (area.includes("customer")) category = "customers";
    else if (area.includes("vendor")) category = "vendors";
    else if (area.includes("quote")) category = "quotations";
    else if (/communication|email/.test(area) || action.startsWith("email.")) category = "email";

    if (category) categories.set(category, (categories.get(category) || 0) + 1);
  }

  const topCategories = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category]) => category);

  if (topCategories.length === 0) {
    return {
      success: false as const,
      message: "There is not enough recent ERP activity to draft an update yet.",
    };
  }

  const draft = `Recent ERP focus: ${topCategories.join(" and ")}.`;
  return { success: true as const, draft };
}
