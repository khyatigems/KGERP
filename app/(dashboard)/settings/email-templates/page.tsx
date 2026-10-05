import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { listEmailTemplates } from "@/lib/email/templates";
import { getZohoConnectionStatus } from "./actions";
import { EmailTemplatesForm } from "./email-templates-form";
import { AnimatedPage } from "@/components/ui/animated-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Templates | KhyatiGems™ ERP",
  robots: { index: false, follow: false },
};

export default async function EmailTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");

  const templates = await listEmailTemplates();
  const zohoStatus = await getZohoConnectionStatus();
  return (
    <AnimatedPage>
      <EmailTemplatesForm templates={templates} zohoStatus={zohoStatus} />
    </AnimatedPage>
  );
}
