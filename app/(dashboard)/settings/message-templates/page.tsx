import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getMessageTemplates } from "./actions";
import { MessageTemplatesForm } from "./message-templates-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Message Templates | KhyatiGems™ ERP",
};

export default async function MessageTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const rows = await getMessageTemplates();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
        <p className="text-muted-foreground">Manage WhatsApp/Web campaign templates for birthdays, anniversaries and loyalty nudges.</p>
      </div>
      <MessageTemplatesForm initial={rows} />
    </div>
  );
}
