import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getLoyaltySettings } from "./actions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { LoyaltySettingsForm } from "./loyalty-settings-form";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Loyalty Settings | KhyatiGems™ ERP",
};

export default async function LoyaltySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const initial = await getLoyaltySettings();
  return (
    <AnimatedPage><div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Settings"><div>
        <h1 className="text-3xl font-bold tracking-tight">Loyalty Settings</h1>
        <p className="text-muted-foreground">Configure earn/redeem rules and profile-completion reward points (DOB/Anniversary).</p>
      </div></WorkspaceHeader>
      <LoyaltySettingsForm initial={initial} />
    </div></AnimatedPage>
  );
}
