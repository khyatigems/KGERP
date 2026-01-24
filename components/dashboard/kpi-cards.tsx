import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Package, ShoppingCart, FileText, FileCheck, Clock, Tag } from "lucide-react";

interface KpiData {
    total: number;
    trend: number;
}

interface ListingsData extends KpiData {
    eBay?: number;
    Etsy?: number;
    Website?: number;
    Amazon?: number;
    WhatsApp?: number;
    [key: string]: number | undefined;
}

interface DashboardData {
    kpis: {
        inventory: KpiData;
        listings: ListingsData;
        quotations: KpiData;
        invoices: KpiData;
        pendingPayments: { count: number; trend: number };
        printLabels: { count: number; trend: number };
    };
}

export function KpiCards({ data }: { data: DashboardData }) {
    const kpis = [
        {
            title: "Total Inventory",
            value: data.kpis.inventory.total,
            trend: data.kpis.inventory.trend,
            icon: Package,
            color: "text-blue-600"
        },
        {
            title: "Active Listings",
            value: data.kpis.listings.total,
            trend: data.kpis.listings.trend,
            icon: ShoppingCart,
            color: "text-purple-600",
            subtext: ["eBay", "Etsy", "Amazon", "Website", "WhatsApp"]
                .map(p => `${p}: ${data.kpis.listings[p] || 0}`)
                .join(" | ")
        },
        {
            title: "Active Quotations",
            value: data.kpis.quotations.total,
            trend: data.kpis.quotations.trend,
            icon: FileText,
            color: "text-amber-600"
        },
        {
            title: "Invoices Generated",
            value: data.kpis.invoices.total,
            trend: data.kpis.invoices.trend,
            icon: FileCheck,
            color: "text-green-600"
        },
        {
            title: "Pending Payments",
            value: data.kpis.pendingPayments.count,
            trend: data.kpis.pendingPayments.trend,
            icon: Clock,
            color: "text-red-600"
        },
        {
            title: "Print Labels Pending",
            value: data.kpis.printLabels.count,
            trend: data.kpis.printLabels.trend,
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
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            {kpi.trend !== 0 && (
                                <span className={`flex items-center ${kpi.trend > 0 ? "text-green-600" : "text-red-600"} mr-2`}>
                                    {kpi.trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                    {Math.abs(kpi.trend)}%
                                </span>
                            )}
                            {kpi.trend === 0 && <span className="text-muted-foreground mr-2">No change</span>}
                            vs last 30 days
                        </div>
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
