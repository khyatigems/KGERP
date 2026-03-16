"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

type BucketStat = {
  bucket: string;
  items: number;
  costValue: number;
};

const COLORS = ["#22c55e", "#06b6d4", "#3b82f6", "#f59e0b", "#ef4444"];

export function InventoryAgingChart({ data }: { data: BucketStat[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBucket = searchParams.get("bucket") || "";

  const chartRows = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        label: `${row.bucket} days`,
      })),
    [data]
  );

  const setBucket = (bucket: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!bucket || bucket === activeBucket) {
      next.delete("bucket");
    } else {
      next.set("bucket", bucket);
    }
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Buckets (Click to drill)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} barCategoryGap={24}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`} />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) =>
                  name === "costValue" ? formatCurrency(Number(value) || 0) : Number(value || 0)
                }
              />
              <Bar
                yAxisId="left"
                dataKey="items"
                name="Items"
                cursor="pointer"
                onClick={(payload) => setBucket(String((payload as { bucket?: string }).bucket || ""))}
              >
                {chartRows.map((entry, index) => (
                  <Cell
                    key={`items-${entry.bucket}`}
                    fill={entry.bucket === activeBucket ? "#111827" : COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="right"
                dataKey="costValue"
                name="Cost Value"
                fill="#6366f1"
                cursor="pointer"
                onClick={(payload) => setBucket(String((payload as { bucket?: string }).bucket || ""))}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
