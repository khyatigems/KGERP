"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

const codeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  active: z.boolean(),
});

type IncomingItem = {
  id?: string;
  name: string;
  code: string;
  active: string;
};

async function upsertMany(
  group: "categories" | "gemstones" | "colors",
  items: IncomingItem[]
) {
  const db = prisma;

  for (const item of items) {
    const active = item.active === "true";
    const parsed = codeSchema.safeParse({
      name: item.name,
      code: item.code,
      active,
    });
    if (!parsed.success) {
      continue;
    }
    if (group === "categories") {
      if (item.id) {
        const existing = await db.categoryCode.findUnique({
          where: { id: item.id },
        });
        const updated = await db.categoryCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
        if (existing) {
          await logActivity({
            entityType: "Code",
            entityId: updated.id,
            entityIdentifier: `Category ${updated.code}`,
            actionType: "EDIT",
            oldData: existing,
            newData: updated,
          });
        }
      } else {
        const created = await db.categoryCode.create({
          data: { name: item.name, code: item.code, active },
        });
        await logActivity({
          entityType: "Code",
          entityId: created.id,
          entityIdentifier: `Category ${created.code}`,
          actionType: "CREATE",
          newData: created,
        });
      }
    } else if (group === "gemstones") {
      if (item.id) {
        const existing = await db.gemstoneCode.findUnique({
          where: { id: item.id },
        });
        const updated = await db.gemstoneCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
        if (existing) {
          await logActivity({
            entityType: "Code",
            entityId: updated.id,
            entityIdentifier: `Gemstone ${updated.code}`,
            actionType: "EDIT",
            oldData: existing,
            newData: updated,
          });
        }
      } else {
        const created = await db.gemstoneCode.create({
          data: { name: item.name, code: item.code, active },
        });
        await logActivity({
          entityType: "Code",
          entityId: created.id,
          entityIdentifier: `Gemstone ${created.code}`,
          actionType: "CREATE",
          newData: created,
        });
      }
    } else if (group === "colors") {
      if (item.id) {
        const existing = await db.colorCode.findUnique({
          where: { id: item.id },
        });
        const updated = await db.colorCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
        if (existing) {
          await logActivity({
            entityType: "Code",
            entityId: updated.id,
            entityIdentifier: `Color ${updated.code}`,
            actionType: "EDIT",
            oldData: existing,
            newData: updated,
          });
        }
      } else {
        const created = await db.colorCode.create({
          data: { name: item.name, code: item.code, active },
        });
        await logActivity({
          entityType: "Code",
          entityId: created.id,
          entityIdentifier: `Color ${created.code}`,
          actionType: "CREATE",
          newData: created,
        });
      }
    }
  }
}

export async function updateCodes(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { message: "Unauthorized" };
  }

  const group = formData.get("group");
  if (group !== "categories" && group !== "gemstones" && group !== "colors") {
    return { message: "Invalid group" };
  }

  const entries: Record<string, IncomingItem> = {};

  formData.forEach((value, key) => {
    if (!key.startsWith(group)) return;
    const match = key.match(/\[(\d+)\]\[(.+)\]$/);
    if (!match) return;
    const index = match[1];
    const field = match[2] as keyof IncomingItem;

    if (!entries[index]) {
      entries[index] = {
        id: undefined,
        name: "",
        code: "",
        active: "true",
      };
    }

    const current = entries[index];
    const updated: IncomingItem = {
      ...current,
      [field]: String(value),
    } as IncomingItem;

    entries[index] = updated;
  });

  const items = Object.values(entries).filter(
    (item) => item.name.trim().length > 0 && item.code.trim().length > 0
  );

  await upsertMany(group, items);

  revalidatePath("/settings/codes");
  return { message: "Codes updated" };
}
