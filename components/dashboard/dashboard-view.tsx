"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { LottieLoader } from "@/components/ui/lottie";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { DashboardGrid, useDashboardLayout, DraggableWidgetConfig } from "./draggable-dashboard";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardView({ name }: { name?: string | null }) {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });
  const { showLoader, hideLoader } = useGlobalLoader();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "default-user";

  const { layout, saveLayout, isLoaded } = useDashboardLayout(userId);

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

  // Compute defaultWidgets with useMemo BEFORE early returns to maintain hooks order
  const revenueTrend = data?.kpis?.revenueTrend || [];
  const defaultWidgets: DraggableWidgetConfig[] = useMemo(() => {
    if (!data || data.error || !data.kpis) return [] as DraggableWidgetConfig[];
    return [
      { id: "header", title: "Dashboard Header", disabled: false, defaultOrder: 0 },
      { id: "health", title: "Business Health", defaultOrder: 1 },
      { id: "marketplace-activity", title: "Marketplace & Activity", defaultOrder: 2 },
      { id: "revenue-inventory", title: "Revenue & Inventory", defaultOrder: 3 },
      { id: "categories-workqueue", title: "Categories & Work Queue", defaultOrder: 4 },
      { id: "sync-gemtypes", title: "Sync & Gem Types", defaultOrder: 5 },
      { id: "notes", title: "Quick Notes", defaultOrder: 6 },
      { id: "matched-pairs", title: "Matched Pairs & Sets", defaultOrder: 7 },
    ];
  }, [data]);

  // Merge loaded layout with defaults to ensure all widgets are present and header is never disabled
  const widgets = useMemo(() => {
    if (!isLoaded) return defaultWidgets;
    if (!Array.isArray(layout) || layout.length === 0) return defaultWidgets;
    
    // Use layout order as the source of truth
    const layoutIds = new Set(layout.map(w => w.id));
    
    // Build widget map from defaults (for fallback data)
    const defaultMap = new Map(defaultWidgets.map(w => [w.id, w]));
    
    // Use layout order, merging with defaults for any missing fields
    const merged = layout.map(w => ({
      ...defaultMap.get(w.id),  // defaults as base
      ...w,                     // override with layout values
      disabled: w.id === "header" ? false : (w.disabled ?? false),
    }));
    
    // Append any new widgets from defaults that aren't in the saved layout yet
    for (const dw of defaultWidgets) {
      if (!layoutIds.has(dw.id)) {
        merged.push({ ...dw, disabled: dw.disabled ?? false });
      }
    }
    
    return merged;
  }, [layout, defaultWidgets, isLoaded]);

  const handleReorder = (newWidgets: DraggableWidgetConfig[]) => {
    saveLayout(newWidgets);
  };

  // Data needed by widget renderers
  const renderData = useMemo(() => ({
    header: {
      dbConnection: data?.dbConnection,
      onRefresh: handleRefresh,
      name,
    },
    health: {
      todayOrders: data?.kpis?.todayOrders ?? 0,
      listings: data?.kpis?.listings,
      inventory: data?.kpis?.inventory,
      labelCart: data?.kpis?.printLabels,
      quotations: data?.kpis?.quotations,
      readyToSell: data?.kpis?.readyToSell,
      salesThisMonth: data?.kpis?.salesThisMonth ?? 0,
    },
    "marketplace-activity": {
      listings: data?.kpis?.listings || { total: 0 },
    },
    "revenue-inventory": {
      revenueTrend,
    },
    "categories-workqueue": {
      categories: data?.analytics?.bestSellingCategories,
      attention: data?.kpis?.attention,
      todayActions: data?.kpis?.today,
      pendingPayments: data?.kpis?.pendingPayments,
      todayOrders: data?.kpis?.todayOrders,
    },
    "sync-gemtypes": {
      gemTypes: data?.analytics?.bestSellingTypes,
    },
    notes: {},
    "matched-pairs": {},
  }), [data, handleRefresh, name, revenueTrend]);

  // Early returns AFTER all hooks
  if (error) return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-red-500 dark:text-red-400 text-sm">Failed to load dashboard data.</p>
      <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">Retry</Button>
    </div>
  );
  if (isLoading) return <LottieLoader variant="dashboard" fullscreen={true} label="Loading Dashboard..." />;
  if (!data || data.error || !data.kpis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-red-500 dark:text-red-400 text-sm">Error loading dashboard: {data?.error || "Invalid data format"}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">Retry</Button>
      </div>
    );
  }

  return (
    <DashboardGrid
      widgets={widgets}
      onReorder={handleReorder}
      renderData={renderData}
    />
  );
}