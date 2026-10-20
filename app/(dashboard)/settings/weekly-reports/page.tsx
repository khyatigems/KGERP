import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { WeeklyReports } from "@/components/settings/weekly-reports";
export default async function WeeklyReportSettingsPage() {
 const session = await auth();
 if (!session?.user?.id || !await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) return <div className="p-8">Administrator permission is required to manage weekly reports.</div>;
 return <WeeklyReports />;
}
