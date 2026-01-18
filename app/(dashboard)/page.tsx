import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ActivityWidget } from "@/components/dashboard/activity-widget";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        <div className="md:col-span-5">
            <DashboardView />
        </div>
        <div className="md:col-span-2">
            <ActivityWidget />
        </div>
    </div>
  );
}
