"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface DashboardLayoutItem {
  id: string;
  title: string;
  disabled: boolean;
  defaultOrder: number;
  size: "default" | "wide" | "full";
}

const widgetIds = new Set([
  "header",
  "health",
  "marketplace-activity",
  "revenue-inventory",
  "categories-workqueue",
  "sync-gemtypes",
  "notes",
  "matched-pairs",
]);

function normalizeLayout(value: unknown): DashboardLayoutItem[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string" || !widgetIds.has(candidate.id) || seen.has(candidate.id)) return [];
    seen.add(candidate.id);

    const size = candidate.size === "wide" || candidate.size === "full" ? candidate.size : "default";
    return [{
      id: candidate.id,
      title: typeof candidate.title === "string" ? candidate.title.slice(0, 100) : candidate.id,
      disabled: candidate.id === "header" ? false : candidate.disabled === true,
      defaultOrder: typeof candidate.defaultOrder === "number" && Number.isFinite(candidate.defaultOrder)
        ? candidate.defaultOrder
        : index,
      size,
    }];
  });
}

export async function getDashboardLayout(): Promise<DashboardLayoutItem[] | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const setting = await prisma.setting.findUnique({
    where: { key: `dashboard_layout:${userId}` },
    select: { value: true },
  });
  if (!setting) return null;

  try {
    const layout = normalizeLayout(JSON.parse(setting.value));
    return layout.length ? layout : null;
  } catch {
    return null;
  }
}

export async function saveDashboardLayout(value: unknown): Promise<{
  success: boolean;
  layout?: DashboardLayoutItem[];
}> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false };

  const layout = normalizeLayout(value);
  if (!layout.length) return { success: false };

  await prisma.setting.upsert({
    where: { key: `dashboard_layout:${userId}` },
    create: { key: `dashboard_layout:${userId}`, value: JSON.stringify(layout) },
    update: { value: JSON.stringify(layout) },
  });
  return { success: true, layout };
}