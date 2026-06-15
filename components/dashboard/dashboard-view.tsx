"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { BusinessHealthCards } from "./business-health-cards";
import { MarketplaceOverview } from "./marketplace-overview";
import { QuickNotes } from "./quick-notes";
import { ActivityFeed } from "./activity-feed";
import { RevenueTrend } from "./revenue-trend";
import { InventoryHealth } from "./inventory-health";
import { MarketplaceSyncHealth } from "./marketplace-sync-health";
import { WorkQueue } from "./work-queue";
import { TopSellingCategories } from "./top-selling-categories";
import { TopSellingGemTypes } from "./top-selling-gem-types";
import { AppLogoLoader } from "@/components/ui/app-logo-loader";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { DashboardHeader } from "./dashboard-header";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardView() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60000,
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

  if (error) return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-red-500 dark:text-red-400 text-sm">Failed to load dashboard data.</p>
      <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">Retry</Button>
    </div>
  );
  if (isLoading) return <AppLogoLoader fullscreen={true} label="Loading Dashboard..." />;
  if (!data || data.error || !data.kpis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-red-500 dark:text-red-400 text-sm">Error loading dashboard: {data?.error || "Invalid data format"}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">Retry</Button>
      </div>
    );
  }

  const revenueTrend = data.kpis.revenueTrend || [];

  return (
    <div className="flex flex-col gap-4">
      <DashboardHeader
        dbConnection={data.dbConnection}
        onRefresh={handleRefresh}
      />

      <BusinessHealthCards
        data={{
          todayOrders: data.kpis.todayOrders ?? 0,
          listings: data.kpis.listings,
          inventory: data.kpis.inventory,
          labelCart: data.kpis.printLabels,
          quotations: data.kpis.quotations,
          readyToSell: data.kpis.readyToSell,
          salesThisMonth: data.kpis.salesThisMonth ?? 0,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <MarketplaceOverview listings={data.kpis.listings || { total: 0 }} />
        </div>
        <div className="lg:col-span-5">
          <ActivityFeed />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueTrend data={revenueTrend} />
        <InventoryHealth />
      </div>

      {/* ROW 3.5: Top Categories (if data) + Work Queue (always) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.analytics?.bestSellingCategories?.length > 0 && (
          <TopSellingCategories data={data.analytics.bestSellingCategories} />
        )}
        <WorkQueue
          attention={data.kpis.attention}
          todayActions={data.kpis.today}
          pendingPayments={data.kpis.pendingPayments}
          todayOrders={data.kpis.todayOrders}
        />
      </div>

      {/* ROW 4: Marketplace Sync (if data) + Top Gem Types (if data) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketplaceSyncHealth />
        {data.analytics?.bestSellingTypes?.length > 0 && (
          <TopSellingGemTypes data={data.analytics.bestSellingTypes} />
        )}
      </div>

      <QuickNotes />
    </div>
  );
}
