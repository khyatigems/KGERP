"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AnalyticsData {
  name: string;
  count: number;
  value: number;
}

interface AnalyticsWidgetsProps {
  categories: AnalyticsData[];
  types: AnalyticsData[];
}

function getChartColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 1; i <= count; i++) {
    colors.push(`var(--chart-${i > 5 ? ((i - 1) % 5) + 1 : i})`);
  }
  return colors;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload?: AnalyticsData }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0];
  const sales = typeof first.value === "number" ? first.value : 0;
  const qty = first.payload?.count ?? 0;
  return (
    <div className="bg-card dark:bg-zinc-800 p-2 border border-border shadow-md rounded-md text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-primary">Sales: ₹{sales.toLocaleString("en-IN")}</p>
      <p className="text-muted-foreground">Qty: {qty}</p>
    </div>
  );
}

export function AnalyticsWidgets({ categories, types }: AnalyticsWidgetsProps) {
  const [categoryColors, setCategoryColors] = useState<string[]>([]);
  const [typeColors, setTypeColors] = useState<string[]>([]);

  useEffect(() => {
    setCategoryColors(getChartColors(categories.length));
    setTypeColors(getChartColors(types.length));
  }, [categories.length, types.length]);

  return (
    <div className="sass-enter grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Best Selling Categories</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {categories && categories.length > 0 ? (
            <div className="min-w-0 min-h-[240px] h-[260px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={240}>
                <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800} animationEasing="ease-out">
                    {categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index] || `var(--chart-${(index % 5) + 1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No sales data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Best Selling Types</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
           {types && types.length > 0 ? (
            <div className="min-w-0 min-h-[240px] h-[260px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={240}>
                <BarChart data={types} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800} animationEasing="ease-out">
                    {types.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={typeColors[index] || `var(--chart-${(index % 5) + 1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No sales data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
