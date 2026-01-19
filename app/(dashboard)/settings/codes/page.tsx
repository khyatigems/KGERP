import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsCodesView } from "@/components/settings/settings-codes-view";

export default async function SettingsCodesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  // Fetch all codes
  const categories = await prisma.categoryCode.findMany({ orderBy: { name: "asc" } });
  const gemstones = await prisma.gemstoneCode.findMany({ orderBy: { name: "asc" } });
  const colors = await prisma.colorCode.findMany({ orderBy: { name: "asc" } });

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
