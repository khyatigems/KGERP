import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCoupons } from "./actions";
import { CouponsForm } from "./coupons-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coupons | KhyatiGems™ ERP",
};

export default async function CouponsSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const rows = await getCoupons();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="text-muted-foreground">Create and manage discount coupons for invoice engagement campaigns.</p>
      </div>
      <CouponsForm initial={rows} />
    </div>
  );
}
