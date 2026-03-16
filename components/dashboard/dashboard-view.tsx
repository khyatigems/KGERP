"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { KpiCards } from "./kpi-cards";
import { PrintLabelWidget } from "./print-label-widget";
import { QuickNotes } from "./quick-notes";
import { AppLogoLoader } from "@/components/ui/app-logo-loader";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { DashboardHeader } from "./dashboard-header";
import { AnalyticsWidgets } from "./analytics-widgets";

import { AttentionWidget } from "./attention-widget";
import { TodaysActionsWidget } from "./todays-actions-widget";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardView() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
  const { showLoader, hideLoader } = useGlobalLoader();

  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === "attention-visibility-last-change") {
        mutate();
      }
    };
    const onAttentionChange = () => {
      mutate();
    };
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("attention-visibility-changed", onAttentionChange);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("attention-visibility-changed", onAttentionChange);
    };
  }, [mutate]);

  const handleRefresh = async () => {
    showLoader();
    try {
      await mutate();
    } finally {
      hideLoader();
    }
  };

  if (error) return <div className="p-4 text-red-500">Failed to load dashboard data.</div>;
  if (isLoading) return <AppLogoLoader fullscreen={true} label="Loading Dashboard Data..." />;

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
      <DashboardHeader 
        dbConnection={data.dbConnection} 
        onRefresh={handleRefresh} 
      />
      
      {/* 1. KPI Cards */}
      <KpiCards data={data} />
      
      {/* 2. Analytics (New) */}
      <AnalyticsWidgets 
        categories={data.analytics?.bestSellingCategories || []}
        types={data.analytics?.bestSellingTypes || []}
      />

      {/* 3. Attention Required */}
      <div className="grid grid-cols-1">
          <AttentionWidget data={data.kpis.attention} />
      </div>

      {/* 4. Widgets Row */}
      <div className="grid gap-6 md:grid-cols-2">
         <PrintLabelWidget count={data.kpis.printLabels.count} lastItem={data.kpis.printLabels.lastItem} />
         <QuickNotes />
      </div>

      {/* 5. Today's Actions */}
      <div className="grid grid-cols-1">
         <TodaysActionsWidget data={data.kpis.today} />
      </div>
    </div>
  );
}
