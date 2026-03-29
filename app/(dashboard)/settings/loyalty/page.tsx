import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getLoyaltySettings } from "./actions";
import { LoyaltySettingsForm } from "./loyalty-settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Loyalty Settings | KhyatiGems™ ERP",
};

export default async function LoyaltySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const initial = await getLoyaltySettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Loyalty Settings</h1>
        <p className="text-muted-foreground">Configure earn/redeem and expiry rules for customer loyalty.</p>
      </div>
      <LoyaltySettingsForm initial={initial} />
    </div>
  );
}
