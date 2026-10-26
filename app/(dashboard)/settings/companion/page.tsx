import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { companionKey, parseCompanionPreferences } from "@/lib/companion";
import { CompanionSettings } from "@/components/companion/companion-settings";

export default async function CompanionSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const setting = await prisma.setting.findUnique({ where: { key: companionKey(session.user.id) }, select: { value: true } });
  return <div className="mx-auto w-full max-w-4xl space-y-6"><Link href="/settings" className="text-sm text-muted-foreground">← Settings</Link><header><p className="text-xs uppercase tracking-widest text-muted-foreground">KhyatiGems · Your workspace</p><h1 className="mt-2 text-3xl font-semibold">ERP Companion</h1><p className="mt-2 text-sm text-muted-foreground">Configure Facet for your account. Disabled by default; ready whenever you are.</p></header><CompanionSettings userId={session.user.id} initialPreferences={parseCompanionPreferences(setting?.value)} /></div>;
}
