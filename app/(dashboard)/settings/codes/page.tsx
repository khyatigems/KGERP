import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsCodesView } from "@/components/settings/settings-codes-view";

import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function SettingsCodesPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  
  if (!hasPermission(role, PERMISSIONS.SETTINGS_MANAGE)) {
    redirect("/");
  }

  // Fetch all codes
  const categories = await prisma.categoryCode.findMany({ orderBy: { name: "asc" } });
  const gemstones = await prisma.gemstoneCode.findMany({ orderBy: { name: "asc" } });
  const colors = await prisma.colorCode.findMany({ orderBy: { name: "asc" } });
  const cuts = await prisma.cutCode.findMany({ orderBy: { name: "asc" } });
  const collections = await prisma.collectionCode.findMany({ orderBy: { name: "asc" } });
  const rashis = await prisma.rashiCode.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Code Management</h1>
      <SettingsCodesView
        categories={categories}
        gemstones={gemstones}
        colors={colors}
        cuts={cuts}
        collections={collections}
        rashis={rashis}
      />
    </div>
  );
}
