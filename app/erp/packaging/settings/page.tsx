import { getPackagingSettings } from "@/app/erp/packaging/actions";
import { SettingsForm } from "./settings-form";
import type { PackagingSettingsInitialData } from "./settings-form";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PackagingHsnMapping } from "@/components/packaging/packaging-hsn-mapping";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export default async function PackagingSettingsPage() {
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) {
    return (
      <div className="space-y-4">
        <WorkspaceHeader eyebrow="KhyatiGems · Settings"><h1 className="text-2xl font-bold tracking-tight">Packaging Settings</h1>
        <p className="text-muted-foreground">{perm.message}</p></WorkspaceHeader>
      </div>
    );
  }

  const settings = await getPackagingSettings();

  return (
    <div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Settings"><div>
        <h1 className="text-3xl font-bold tracking-tight">Packaging Settings</h1>
        <p className="text-muted-foreground">
          Configure global settings for serialized packaging labels.
        </p>
      </div></WorkspaceHeader>
      <SettingsForm initialData={(settings.data as PackagingSettingsInitialData | null) ?? null} />
      <PackagingHsnMapping />
    </div>
  );
}
