import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getAuthenticatorState } from "@/lib/security/authenticator";
import { isSecretEncryptionConfigured } from "@/lib/security/secret-store";
import { AuthenticatorForm } from "@/components/settings/authenticator-form";
import { countRecoveryCodes, getSecurityPolicy } from "@/lib/security/service";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { SecurityForm } from "./security-form";

export const dynamic = "force-dynamic";
export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canManage = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  const authenticator = await getAuthenticatorState(session.user.id, true);
  const policy = await getSecurityPolicy();
  const recoveryRemaining = canManage && policy.enabled ? await countRecoveryCodes(session.user.id, policy.version) : 0;
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href={canManage ? "/settings" : "/"} className="text-sm text-muted-foreground underline">{canManage ? "Back to Settings" : "Back to workspace"}</Link>
    <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><div><h1 className="text-2xl font-semibold">Security &amp; 2FA</h1><p className="text-sm text-muted-foreground">Manage your personal authenticator and ERP sign-in protection.</p></div></div>
    <AuthenticatorForm enabled={authenticator.enabled} recoveryRemaining={authenticator.recoveryRemaining} accountEmail={session.user.email || ""} emailEnabled={policy.enabled} configured={isSecretEncryptionConfigured()} />
    {canManage && <SecurityForm initial={policy} zohoConfigured={new ZohoMailConnector().isConfigured()} recoveryRemaining={recoveryRemaining} accountEmail={session.user.email || ""} />}
  </div>;
}
