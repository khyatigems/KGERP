import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePagePermission } from "@/lib/require-page-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { countRecoveryCodes, getSecurityPolicy } from "@/lib/security/service";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { SecurityForm } from "./security-form";

export const dynamic = "force-dynamic";
export default async function SecuritySettingsPage() {
  const session = await requirePagePermission(PERMISSIONS.SETTINGS_MANAGE);
  const policy = await getSecurityPolicy();
  const recoveryRemaining = policy.enabled ? await countRecoveryCodes(session.user.id, policy.version) : 0;
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/settings" className="text-sm text-muted-foreground underline">Back to Settings</Link>
    <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><div><h1 className="text-2xl font-semibold">Security &amp; 2FA</h1><p className="text-sm text-muted-foreground">Protect ERP sign-ins with a password and a Zoho email verification code.</p></div></div>
    <SecurityForm initial={policy} zohoConfigured={new ZohoMailConnector().isConfigured()} recoveryRemaining={recoveryRemaining} accountEmail={session.user.email || ""} />
  </div>;
}
