"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { companionKey, companionSchema } from "@/lib/companion";
import { revalidatePath } from "next/cache";

export async function saveCompanionPreferences(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  if (!await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) return { error: "Settings permission is required." };
  const parsed = companionSchema.safeParse(input);
  if (!parsed.success) return { error: "Please check your companion preferences." };
  try {
    const key = companionKey(session.user.id);
    const value = JSON.stringify(parsed.data);
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    revalidatePath("/", "layout");
    return { preferences: parsed.data };
  } catch { return { error: "Preferences could not be saved. Please try again." }; }
}
