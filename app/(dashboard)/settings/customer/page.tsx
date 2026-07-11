import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CustomerSettingsForm } from "./customer-settings-form";

export const metadata: Metadata = {
  title: "Customer Settings | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage() {
  const row = await prisma.setting.findUnique({ where: { key: "customer_settings" } });
  const settings = row ? JSON.parse(row.value) : null;

  return (
    <AnimatedPage><div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Customer Settings</h1>
      <CustomerSettingsForm settings={settings} />
    </div></AnimatedPage>
  );
}
