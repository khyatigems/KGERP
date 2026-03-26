import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { LandingPageForm } from "@/components/settings/landing-page-form";
import { getLandingPageSettings } from "./actions";

export const metadata = {
  title: "Landing Page Settings | KhyatiGems ERP",
};

export default async function LandingPageSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  if (!session?.user?.id || !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_LANDING_PAGE))) {
    redirect("/dashboard");
  }

  const settings = await getLandingPageSettings();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <LandingPageForm initialSettings={settings} />
    </div>
  );
}
