import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExportButton } from "@/components/ui/export-button";
import { format } from "date-fns";

export default async function InventoryReportsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    
    // Check view permission
    // Assuming simple role check if permissions lib is complex, but using existing pattern
    const canViewCost = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

    // 1. Total Count & Value
    const inventory = await prisma.inventory.findMany({
        where: { status: "IN_STOCK" },
        select: {
            id: true,
            sku: true,
            itemName: true,
            createdAt: true,
            pricingMode: true,
            weightValue: true,
            purchaseRatePerCarat: true,
            flatPurchaseCost: true,
            category: true,
            gemType: true,
            stoneType: true,
            location: true
        }
    });

    const totalCount = inventory.length;
    let totalValue = 0;

    // 2. Aging Buckets
    let aging30 = 0;
    let aging90 = 0;

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    const exportData = inventory.map(item => {
        // Value Calculation (Cost)
        let cost = 0;
        if (canViewCost) {
            if (item.pricingMode === "PER_CARAT") {
                cost = (item.weightValue || 0) * (item.purchaseRatePerCarat || 0);
            } else {
                cost = (item.flatPurchaseCost || 0);
            }
            totalValue += cost;
        }

        // Aging
        const daysOld = Math.floor((now.getTime() - item.createdAt.getTime()) / msPerDay);
        if (daysOld > 90) aging90++;
        else if (daysOld > 30) aging30++;

        return {
            SKU: item.sku,
            Item: item.itemName,
            Category: item.category,
            Type: item.gemType || item.stoneType || "-",
            Location: item.location || "N/A",
            "Added Date": format(item.createdAt, "yyyy-MM-dd"),
            "Days Old": daysOld,
            "Cost Value": canViewCost ? cost : "N/A"
        };
    });

    const exportColumns = [
        { header: "SKU", key: "SKU" },
        { header: "Item", key: "Item" },
        { header: "Category", key: "Category" },
        { header: "Type", key: "Type" },
        { header: "Location", key: "Location" },
        { header: "Added Date", key: "Added Date" },
        { header: "Days Old", key: "Days Old" },
        { header: "Cost Value", key: "Cost Value" }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Inventory Reports</h2>
                <ExportButton 
                    filename={`Inventory_Report_${format(now, 'yyyyMMdd')}`} 
                    data={exportData} 
                    columns={exportColumns}
                    title="Current Inventory Report"
                />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCount}</div>
                    </CardContent>
                </Card>
                {canViewCost && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Value (Cost)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{'>'} 90 Days Old</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{aging90}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{'>'} 30 Days Old</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{aging30}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
