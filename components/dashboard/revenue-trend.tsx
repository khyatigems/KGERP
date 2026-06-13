"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Calendar, BarChart3, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, cn } from "@/lib/utils";

interface RevenueTrendProps {
  data: Array<{ date: string; revenue: number }>;
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function fillMissingDates(raw: Array<{ date: string; revenue: number }>, days: number): Array<{ date: string; revenue: number }> {
  const map = new Map(raw.map((d) => [d.date, d.revenue]));
  const result: Array<{ date: string; revenue: number }> = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(year, month, day - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${d.getFullYear()}-${mm}-${dd}`;
    result.push({ date: key, revenue: map.get(key) ?? 0 });
  }
  return result;
}

export function RevenueTrend({ data }: RevenueTrendProps) {
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");
  const ranges = ["7D", "30D", "90D", "1Y"] as const;

  const rangeDays: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
  const days = rangeDays[range];

  const chartData = useMemo(() => fillMissingDates(data, days), [data, days]);
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const hasAnySales = data.length > 0 && data.some((d) => d.revenue > 0);
  const interval = days <= 7 ? 0 : days <= 30 ? 4 : days <= 90 ? 9 : 29;

  const avgDaily = days > 0 ? totalRevenue / days : 0;
  const bestDay = chartData.length > 0 ? Math.max(...chartData.map((d) => d.revenue)) : 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = chartData.find((d) => d.date === todayStr)?.revenue ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full gem-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Revenue Trend</h2>
            <p className="text-xs text-muted-foreground">
              {hasAnySales ? `${formatCurrency(totalRevenue)} total` : `Last ${range}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: string) => {
                const d = new Date(val + "T00:00:00");
                return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
              }}
              interval={interval}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: number) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#10B981", stroke: "var(--card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10">
            <Calendar className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Today</p>
            <p className="text-xs font-semibold text-foreground">{formatCurrency(todayRevenue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-500/10">
            <BarChart3 className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Avg / day</p>
            <p className="text-xs font-semibold text-foreground">{formatCurrency(avgDaily)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10">
            <ArrowUpRight className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Best day</p>
            <p className="text-xs font-semibold text-foreground">{formatCurrency(bestDay)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
