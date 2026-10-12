import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { WebsiteManager } from "./website-manager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Website Management | Khyati Gems ERP", robots: { index: false, follow: false } };
export default async function WebsiteManagementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await checkUserPermission(session.user.id,PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  if (process.env.WEBSITE_MANAGEMENT_ENABLED !== "true") return <div className="p-8"><h1 className="text-2xl font-semibold">Website Management</h1><p className="mt-3">The section is available, but saving is disabled until the separate website database is configured on this ERP installation.</p><p className="mt-3">Local configuration is documented in docs/website-development.md. Restart the local ERP server after adding the website settings. Hosted installations require their own separate database configuration.</p></div>;
  return <WebsiteManager />;
}
