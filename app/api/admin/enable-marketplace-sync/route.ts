import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FLAGS_TO_ENABLE = [
  { key: "marketplaceApiSyncEnabled", value: "true" },
  { key: "ebaySyncEnabled", value: "true" },
  { key: "etsySyncEnabled", value: "true" },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  for (const flag of FLAGS_TO_ENABLE) {
    await prisma.setting.upsert({
      where: { key: flag.key },
      create: flag,
      update: { value: flag.value },
    });
    results[flag.key] = "enabled";
  }

  return NextResponse.json({ success: true, flags: results });
}
