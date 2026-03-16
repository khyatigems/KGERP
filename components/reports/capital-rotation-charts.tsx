"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

type CategoryRow = {
  category: string;
  avgSellDays: number;
  rotationRate: number;
  avgProfit: number;
  soldItems: number;
  purchaseValue: number;
  sellValue: number;
};

type BucketRow = {
  bucket: string;
  items: number;
  costValue: number;
  sellValue: number;
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function CapitalRotationCharts({
  byCategory,
  ageValueByBucket,
}: {
  byCategory: CategoryRow[];
  ageValueByBucket: BucketRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";

  const setCategory = (category: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!category || category === selectedCategory) next.delete("category");
    else next.set("category", category);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Category Rotation (Click to focus)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => `${Number(value || 0).toFixed(2)}x`} />
                <Bar
                  dataKey="rotationRate"
                  name="Rotation Rate"
                  cursor="pointer"
                  onClick={(payload) => setCategory(String((payload as { category?: string }).category || ""))}
                >
                  {byCategory.map((row, index) => (
                    <Cell key={`${row.category}-${index}`} fill={selectedCategory === row.category ? "#111827" : COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capital at Risk by Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageValueByBucket}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(Number(value || 0))} />
                <Bar
                  dataKey="costValue"
                  name="Cost Value"
                  fill="#f97316"
                  cursor="pointer"
                  onClick={(payload) =>
                    router.push(`/reports/inventory-aging?bucket=${encodeURIComponent(String((payload as { bucket?: string }).bucket || ""))}`)
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
