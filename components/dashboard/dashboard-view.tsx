"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { KpiCards } from "./kpi-cards";
import { PrintLabelWidget } from "./print-label-widget";
import { QuickNotes } from "./quick-notes";
import { AppLogoLoader } from "@/components/ui/app-logo-loader";
import { useGlobalLoader } from "@/components/global-loader-provider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardView() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher);
  const { showLoader, hideLoader } = useGlobalLoader();

  const handleRefresh = async () => {
    showLoader();
    try {
      await mutate();
    } finally {
      hideLoader();
    }
  };

  if (error) return <div className="p-4 text-red-500">Failed to load dashboard data.</div>;
  if (isLoading) return <div className="p-12 flex justify-center"><AppLogoLoader fullscreen={false} className="w-64 h-64" label="Loading Dashboard..." /></div>;

  // Handle case where API returns an error object or missing data
  if (!data || data.error || !data.kpis) {
      return (
          <div className="p-4 text-red-500">
              Error loading dashboard: {data?.error || "Invalid data format"}
              <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-4">Retry</Button>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${data.dbConnection === 'Turso Cloud' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                DB: {data.dbConnection || 'Unknown'}
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">Refresh</Button>
        </div>
      </div>
      
      <KpiCards data={data} />
      
      <div className="grid gap-6 md:grid-cols-2">
         <PrintLabelWidget count={data.kpis.printLabels.count} lastItem={data.kpis.printLabels.lastItem} />
         <QuickNotes />
      </div>
    </div>
  );
}
