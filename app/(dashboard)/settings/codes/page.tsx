import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsCodesView } from "@/components/settings/settings-codes-view";
import type { CategoryCode, GemstoneCode, ColorCode } from "@prisma/client";

export default async function SettingsCodesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  type SqliteTableRow = { name: string };

  const tableRows = await prisma.$queryRaw<SqliteTableRow[]>`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' 
      AND name IN ('CategoryCode', 'GemstoneCode', 'ColorCode')
  `;

  const existingTables = new Set(tableRows.map((row) => row.name));

  const hasAllTables =
    existingTables.has("CategoryCode") &&
    existingTables.has("GemstoneCode") &&
    existingTables.has("ColorCode");

  let categories: CategoryCode[] = [];
  let gemstones: GemstoneCode[] = [];
  let colors: ColorCode[] = [];

  if (hasAllTables) {
    const result = await Promise.all([
      prisma.$queryRaw<CategoryCode[]>`SELECT * FROM CategoryCode ORDER BY name ASC`,
      prisma.$queryRaw<GemstoneCode[]>`SELECT * FROM GemstoneCode ORDER BY name ASC`,
      prisma.$queryRaw<ColorCode[]>`SELECT * FROM ColorCode ORDER BY name ASC`,
    ]);

    categories = result[0] ?? [];
    gemstones = result[1] ?? [];
    colors = result[2] ?? [];
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Code Management</h1>
      <SettingsCodesView
        categories={categories}
        gemstones={gemstones}
        colors={colors}
      />
    </div>
  );
}
