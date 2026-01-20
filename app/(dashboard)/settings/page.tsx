import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Settings2, Search } from "lucide-react";
import { removeDuplicates } from "@/lib/dedup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LandingPageForm } from "@/components/settings/landing-page-form";
import { getLandingPageSettings } from "./landing-page/actions";
import { ExtendedLandingPageSettings } from "@/components/settings/landing-page-form";
import { Input } from "@/components/ui/input";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const rawSettings = await prisma.setting.findMany();
  // Deduplicate settings by key
  const settings = removeDuplicates(rawSettings, 'key');
  
  const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

  // Fetch Landing Page Settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landingPageSettings = await getLandingPageSettings() as any;

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
          <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/settings/codes">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <Database className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Code Management</CardTitle>
                  <CardDescription>Manage system codes and reference data.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
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
           <Card className="opacity-50">
              <CardHeader>
                <Settings2 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>System-level parameters and environment variables (Read-only).</CardDescription>
              </CardHeader>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
