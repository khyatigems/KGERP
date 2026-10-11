"use client";
import dynamic from "next/dynamic";
import { useWorkspaceAppearance } from "@/components/workspace-appearance-provider";
import type { DashboardViewPreference } from "@/lib/workspace-appearance";
import type { TradingDashboardData } from "@/lib/trading-dashboard-types";
import { TradingDashboard } from "./trading-dashboard";

// Existing widgets and their charts/drag-and-drop load only when selected.
const CurrentDashboard = dynamic(() => import("./dashboard-view").then(module => module.DashboardView), { loading: () => <p className="p-6 text-sm text-muted-foreground">Loading business overview…</p> });
export function DashboardSwitcher({ name, userId, initialView, initialData }: { name?: string | null; userId: string; initialView: DashboardViewPreference; initialData?: TradingDashboardData }) {
  const { appearance, ready } = useWorkspaceAppearance();
  const view = ready ? appearance.dashboardView : initialView;
  return view === "classic" ? <CurrentDashboard name={name}/> : <TradingDashboard userId={userId} initialData={initialData}/>;
}
