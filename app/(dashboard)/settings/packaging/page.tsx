import { getPackagingSettings } from "@/app/erp/packaging/actions";
import { SettingsForm } from "@/app/erp/packaging/settings/settings-form";
import { PackagingHsnMapping } from "@/components/packaging/packaging-hsn-mapping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function PackagingSettingsPage() {
  const settings = await getPackagingSettings();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Packaging Settings</CardTitle>
          <CardDescription>Configure branding, legal text, and label fields for Packaging labels.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialData={settings.data} />
        </CardContent>
      </Card>
      <PackagingHsnMapping />
    </div>
  );
}
