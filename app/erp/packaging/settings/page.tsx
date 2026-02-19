import { getPackagingSettings } from "@/app/erp/packaging/actions";
import { SettingsForm } from "./settings-form";
import type { PackagingSettingsInitialData } from "./settings-form";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PackagingHsnMapping } from "@/components/packaging/packaging-hsn-mapping";

export default async function PackagingSettingsPage() {
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Packaging Settings</h1>
        <p className="text-muted-foreground">{perm.message}</p>
      </div>
    );
  }

  const settings = await getPackagingSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Packaging Settings</h1>
        <p className="text-muted-foreground">
          Configure global settings for serialized packaging labels.
        </p>
      </div>
      <SettingsForm initialData={(settings.data as PackagingSettingsInitialData | null) ?? null} />
      <PackagingHsnMapping />
    </div>
  );
}
