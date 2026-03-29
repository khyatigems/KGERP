"use client";

import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { formatInrNumber } from "@/lib/number-formatting";

type InventoryStatsResponse = {
  totalItems: number;
  totalSell: number;
  withCertificateCount: number;
  aging?: { dead: number };
};

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
};

export function InventoryInsightBar() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const url = `/api/inventory/stats${qs ? `?${qs}` : ""}`;
  const { data } = useSWR<InventoryStatsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  if (!data) return null;

  const uncertified = Math.max(0, (data.totalItems || 0) - (data.withCertificateCount || 0));
  const dead = data.aging?.dead ?? 0;

  return (
    <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
      Showing <span className="text-foreground font-medium">{data.totalItems}</span> items | ₹
      <span className="text-foreground font-medium">{formatInrNumber(Number(data.totalSell || 0), 0)}</span> total value |{" "}
      <span className="text-foreground font-medium">{dead}</span> items &gt; 90 days |{" "}
      <span className="text-foreground font-medium">{uncertified}</span> uncertified
    </div>
  );
}

