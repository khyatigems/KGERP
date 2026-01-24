import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function InventoryReportsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    
    // Check view permission
    if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
        redirect("/");
    }

    const canViewCost = hasPermission(session.user.role, PERMISSIONS.INVENTORY_VIEW_COST);

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
            category: true
        }
    });

    const totalCount = inventory.length;
    let totalValue = 0;

    // 2. Aging Buckets
    let aging30 = 0;
    let aging60 = 0;
    let aging90 = 0;

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    inventory.forEach(item => {
        // Value Calculation (Cost)
        if (canViewCost) {
            let cost = 0;
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
        else if (daysOld > 60) aging60++;
        else if (daysOld > 30) aging30++;
    });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Inventory Reports</h2>
            
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

            {/* Aging Table (Top 50 Oldest) */}
            <Card>
                <CardHeader>
                    <CardTitle>Oldest Inventory Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Days Old</TableHead>
                                {canViewCost && <TableHead>Cost</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory
                                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                                .slice(0, 50)
                                .map(item => {
                                    const daysOld = Math.floor((now.getTime() - item.createdAt.getTime()) / msPerDay);
                                    let cost = 0;
                                    if (canViewCost) {
                                        if (item.pricingMode === "PER_CARAT") {
                                            cost = (item.weightValue || 0) * (item.purchaseRatePerCarat || 0);
                                        } else {
                                            cost = (item.flatPurchaseCost || 0);
                                        }
                                    }
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono">{item.sku}</TableCell>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell className={daysOld > 90 ? "text-red-600 font-bold" : ""}>{daysOld}</TableCell>
                                            {canViewCost && <TableCell>{formatCurrency(cost)}</TableCell>}
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
