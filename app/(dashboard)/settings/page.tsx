import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Settings2, Search, FileText } from "lucide-react";
import { removeDuplicates } from "@/lib/dedup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LandingPageForm } from "@/components/settings/landing-page-form";
import { getLandingPageSettings } from "./landing-page/actions";
import { ExtendedLandingPageSettings } from "@/components/settings/landing-page-form";
import { Input } from "@/components/ui/input";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { LoadingLink } from "@/components/ui/loading-link";

import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function SettingsPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  
  if (!hasPermission(role, PERMISSIONS.SETTINGS_MANAGE)) {
    redirect("/");
  }

  const rawSettings = await prisma.setting.findMany();
  // Deduplicate settings by key
  const settings = removeDuplicates(rawSettings, 'key');
  
  const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

  // Fetch Landing Page Settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landingPageSettings = await getLandingPageSettings() as any;

  // Fetch Company Settings
  const companySettings = await prisma.companySettings.findFirst();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your application settings and preferences.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search settings..." className="pl-8" />
        </div>
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Module Configuration</TabsTrigger>
          <TabsTrigger value="company">Company Profile</TabsTrigger>
          <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LoadingLink href="/settings/codes">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <Database className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Code Management</CardTitle>
                  <CardDescription>Manage system codes and reference data.</CardDescription>
                </CardHeader>
              </Card>
            </LoadingLink>
            
            <LoadingLink href="/settings/invoice">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Invoice Settings</CardTitle>
                  <CardDescription>Configure invoice prefixes, terms, and tax settings.</CardDescription>
                </CardHeader>
              </Card>
            </LoadingLink>
          </div>
        </TabsContent>

        <TabsContent value="company">
            <Card>
                <CardHeader>
                    <CardTitle>Company Profile</CardTitle>
                    <CardDescription>Manage your company details and logo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CompanySettingsForm initialData={companySettings} />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="landing-page" className="space-y-4">
            <LandingPageForm initialSettings={landingPageSettings as ExtendedLandingPageSettings} />
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Quick Settings</CardTitle>
              <CardDescription>Commonly used system parameters.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm config={config} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
           <Card>
              <CardHeader>
                <Settings2 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>System-level parameters and environment variables (Read-only).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.map((setting: { key: string; value: string; description: string | null }) => (
                  <div key={setting.key} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{setting.key}</p>
                      {setting.description && (
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      )}
                    </div>
                    <div className="font-mono text-sm break-all">{setting.value}</div>
                  </div>
                ))}
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
