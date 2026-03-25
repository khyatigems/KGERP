"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LowActivityAlertsWidget({ saleDays = 14, invDays = 7 }: { saleDays?: number; invDays?: number }) {
  const { data } = useSWR(`/api/dashboard/widgets/low-activity?saleDays=${saleDays}&invDays=${invDays}`, fetcher);

  const nosale = data?.nosale;
  const noinv = data?.noinv;
  const staleCount = data?.staleSkusCount || 0;

  return (
    <Card className={(nosale || noinv) ? "border-red-300 bg-red-50/30" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Low Activity Alerts</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>Last Sale: <span className="font-medium">{data?.lastSaleDate ? formatDate(data.lastSaleDate) : "-"}</span></div>
        <div>Last Inventory Added: <span className="font-medium">{data?.lastInventoryDate ? formatDate(data.lastInventoryDate) : "-"}</span></div>
        <div>Stale In-Stock SKUs ({`>`}{invDays} days): <span className="font-medium">{staleCount}</span></div>
        {(nosale || noinv) ? <div className="text-xs text-red-600">Activity below threshold — review pipeline.</div> : null}
      </CardContent>
    </Card>
  );
}
