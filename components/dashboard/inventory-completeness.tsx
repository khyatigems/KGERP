"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function InventoryCompletenessWidget() {
  const { data } = useSWR<{ totalItems: number; overallTotalItems?: number; withImagesCount: number; withCertificateCount: number; withHsnCount: number; completenessAllCount: number }>(
    "/api/inventory/stats",
    fetcher
  );

  const total = data?.totalItems || 0;
  const overall = data?.overallTotalItems || total;
  const images = data?.withImagesCount || 0;
  const certs = data?.withCertificateCount || 0;
  const hsn = data?.withHsnCount || 0;
  const all = data?.completenessAllCount || 0;

  const pct = overall > 0 ? Math.round((all / overall) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Inventory Completeness</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 36 36" className="h-24 w-24">
            <path
              d="M18 2.0845
                 a 15.9155 15.9155 0 0 1 0 31.831
                 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#eee"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                 a 15.9155 15.9155 0 0 1 0 31.831
                 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={`${pct}, 100`}
              strokeWidth="3"
            />
            <text x="18" y="20.35" className="fill-current text-xs" textAnchor="middle">{pct}%</text>
          </svg>
        </div>
        <div className="text-sm space-y-1">
          <div>With Images: <span className="font-medium">{images}/{overall}</span></div>
          <div>With Certificate: <span className="font-medium">{certs}/{overall}</span></div>
          <div>With HSN: <span className="font-medium">{hsn}/{overall}</span></div>
          <div className="text-xs text-muted-foreground">All three present: {all}/{overall}</div>
        </div>
      </CardContent>
    </Card>
  );
}
