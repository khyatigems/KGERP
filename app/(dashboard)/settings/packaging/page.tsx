import { getPackagingSettings } from "@/app/erp/packaging/actions";
import { SettingsForm } from "@/app/erp/packaging/settings/settings-form";
import { PackagingHsnMapping } from "@/components/packaging/packaging-hsn-mapping";
import { AnimatedPage } from "@/components/ui/animated-page";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function PackagingSettingsPage() {
  const settings = await getPackagingSettings();
  return (
    <AnimatedPage><div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Settings"><h1>Packaging Settings</h1><p>Configure branding, legal text, and the fields printed on packaging labels.</p></WorkspaceHeader>
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
    </div></AnimatedPage>
  );
}
