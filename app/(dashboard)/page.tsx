import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        <div className="md:col-span-5">
            <DashboardView />
        </div>
        <div className="md:col-span-2">
            <ActivityFeed />
        </div>
    </div>
  );
}
