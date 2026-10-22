import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getCoupons } from "./actions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CouponsForm } from "./coupons-form";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coupons | KhyatiGems™ ERP",
};

export default async function CouponsSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const rows = await getCoupons();
  return (
    <AnimatedPage><div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Settings"><div>
        <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="text-muted-foreground">Create one-time or reusable coupon rules. Only one coupon is allowed per invoice.</p>
      </div></WorkspaceHeader>
      <CouponsForm initial={rows} />
    </div></AnimatedPage>
  );
}
