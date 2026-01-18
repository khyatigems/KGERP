import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsCodesView } from "@/components/settings/settings-codes-view";

type CodeRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

  const hasCategoryTable = existingTables.has("CategoryCode");
  const hasGemstoneTable = existingTables.has("GemstoneCode");
  const hasColorTable = existingTables.has("ColorCode");

  let categories: CodeRow[] = [];
  let gemstones: CodeRow[] = [];
  let colors: CodeRow[] = [];

  if (hasCategoryTable) {
    const rows =
      await prisma.$queryRaw<CodeRow[]>`SELECT * FROM CategoryCode ORDER BY name ASC`;
    categories = rows ?? [];
  }

  if (hasGemstoneTable) {
    const rows =
      await prisma.$queryRaw<CodeRow[]>`SELECT * FROM GemstoneCode ORDER BY name ASC`;
    gemstones = rows ?? [];
  }

  if (hasColorTable) {
    const rows =
      await prisma.$queryRaw<CodeRow[]>`SELECT * FROM ColorCode ORDER BY name ASC`;
    colors = rows ?? [];
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
