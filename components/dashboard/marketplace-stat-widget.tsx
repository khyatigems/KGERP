"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Globe } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function MarketplaceStatWidget() {
  const { data } = useSWR("/api/marketplace/stats", fetcher, {
    refreshInterval: 15000,
  });

  const pending = data?.pendingConflicts ?? 0;
  const critical = data?.criticalConflicts ?? 0;

  return (
    <Card className="sass-enter overflow-hidden flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/50">
        <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
        <Globe className="h-4 w-4 text-orange-500" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3 p-4 pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <div className="text-lg font-bold text-orange-500">{pending}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Pending</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{critical}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Critical</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/marketplace-control-center">Control Center</Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href="/marketplace-conflicts">Conflicts</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
