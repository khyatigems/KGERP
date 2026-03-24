import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Package, ShoppingCart, FileText, FileCheck, Clock, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface KpiData {
    total: number;
    trend: number;
    breakdown?: Record<string, unknown>;
}

interface ListingsData extends KpiData {
    eBay?: number;
    Etsy?: number;
    Website?: number;
    Amazon?: number;
    WhatsApp?: number;
}

interface DashboardData {
    kpis: {
        inventory: KpiData;
        listings: ListingsData;
        quotations: KpiData;
        invoices: KpiData;
        pendingPayments: { count: number; trend: number; breakdown?: Record<string, unknown> };
        printLabels: { count: number; trend: number; breakdown?: Record<string, unknown> };
    };
}

export function KpiCards({ data }: { data: DashboardData }) {
    const kpis = [
        {
            title: "Total Inventory",
            value: data.kpis.inventory.total,
            trend: data.kpis.inventory.trend,
            breakdown: data.kpis.inventory.breakdown,
            icon: Package,
            color: "text-blue-600"
        },
        {
            title: "Active Listings",
            value: data.kpis.listings.total,
            trend: data.kpis.listings.trend,
            breakdown: data.kpis.listings.breakdown,
            icon: ShoppingCart,
            color: "text-purple-600",
            subtext: ["eBay", "Etsy", "Amazon", "Website", "WhatsApp"]
                .map((p) => `${p}: ${(data.kpis.listings as unknown as Record<string, number | undefined>)[p] || 0}`)
                .join(" | ")
        },
        {
            title: "Active Quotations",
            value: data.kpis.quotations.total,
            trend: data.kpis.quotations.trend,
            breakdown: data.kpis.quotations.breakdown,
            icon: FileText,
            color: "text-amber-600"
        },
        {
            title: "Invoices Generated",
            value: data.kpis.invoices.total,
            trend: data.kpis.invoices.trend,
            breakdown: data.kpis.invoices.breakdown,
            icon: FileCheck,
            color: "text-green-600"
        },
        {
            title: "Pending Payments",
            value: data.kpis.pendingPayments.count,
            trend: data.kpis.pendingPayments.trend,
            breakdown: data.kpis.pendingPayments.breakdown,
            icon: Clock,
            color: "text-red-600"
        },
        {
            title: "Print Labels Pending",
            value: data.kpis.printLabels.count,
            trend: data.kpis.printLabels.trend,
            breakdown: data.kpis.printLabels.breakdown,
            icon: Tag,
            color: "text-indigo-600"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {kpi.title}
                        </CardTitle>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center text-xs text-muted-foreground mt-1 cursor-help select-none">
                                {kpi.trend !== 0 && (
                                    <span className={`flex items-center ${kpi.trend > 0 ? "text-green-600" : "text-red-600"} mr-2`}>
                                        {kpi.trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                        {Math.abs(kpi.trend)}%
                                    </span>
                                )}
                                {kpi.trend === 0 && <span className="text-muted-foreground mr-2">No change</span>}
                                vs last 30 days
                            </div>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-80 text-sm">
                            <div className="font-medium">{kpi.title} breakdown</div>
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {kpi.breakdown ? (
                                Object.entries(kpi.breakdown).map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-4">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                                    <span className="font-mono">{typeof value === "number" ? value.toLocaleString("en-IN") : String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <div>No detailed breakdown available.</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {kpi.subtext && (
                            <div className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
                                {kpi.subtext}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
