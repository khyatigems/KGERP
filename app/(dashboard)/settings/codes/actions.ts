"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  for (const item of items) {
    const active = item.active === "true";
    if (group === "categories") {
      if (item.id) {
        await prisma.categoryCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
      } else {
        await prisma.categoryCode.create({
          data: { name: item.name, code: item.code, active },
        });
      }
    } else if (group === "gemstones") {
      if (item.id) {
        await prisma.gemstoneCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
      } else {
        await prisma.gemstoneCode.create({
          data: { name: item.name, code: item.code, active },
        });
      }
    } else if (group === "colors") {
      if (item.id) {
        await prisma.colorCode.update({
          where: { id: item.id },
          data: { name: item.name, code: item.code, active },
        });
      } else {
        await prisma.colorCode.create({
          data: { name: item.name, code: item.code, active },
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
    const field = match[2];
    if (!entries[index]) {
      entries[index] = {
        id: undefined,
        name: "",
        code: "",
        active: "true",
      };
    }
    (entries[index] as any)[field] = String(value);
  });

  const items = Object.values(entries).filter(
    (item) => item.name.trim().length > 0 && item.code.trim().length > 0
  );

  await upsertMany(group, items);

  revalidatePath("/settings/codes");
  return { message: "Codes updated" };
}
