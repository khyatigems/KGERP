"use client";

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

const COLORS = ["#181547", "#D03837", "#FFBB28", "#FF8042", "#8884d8"];

type TooltipPayload = { value: number; payload: AnalyticsData };
type TooltipProps = { active?: boolean; payload?: TooltipPayload[]; label?: string };

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0];
  const sales = typeof first.value === "number" ? first.value : 0;
  const qty = first.payload?.count ?? 0;
  return (
    <div className="bg-white dark:bg-zinc-800 p-2 border border-border shadow-md rounded-md text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-primary">Sales: ₹{sales.toLocaleString("en-IN")}</p>
      <p className="text-muted-foreground">Qty: {qty}</p>
    </div>
  );
}

export function AnalyticsWidgets({ categories, types }: AnalyticsWidgetsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Best Selling Categories</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {categories && categories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart data={types} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
