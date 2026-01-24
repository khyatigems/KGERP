"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Sale {
    id?: string; // id might not be selected in API if I missed it, but I added it in select? No I didn't!
    customerName: string | null;
    netAmount: number;
    saleDate: string | Date;
    paymentStatus: string | null;
}

export function RecentSales({ sales }: { sales: Sale[] }) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {sales.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent sales found.</p>
                    ) : (
                        sales.map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{sale.customerName?.charAt(0) || "C"}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{sale.customerName || "Unknown Customer"}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(sale.saleDate)}</p>
                                    </div>
                                </div>
                                <div className="font-medium">
                                    {formatCurrency(sale.netAmount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
