import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ShoppingCart } from "lucide-react";
import Link from "next/link";

export function PrintLabelWidget({ count, lastItem }: { count: number; lastItem: string | null }) {
    return (
        <Card className="overflow-hidden flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50">
                <CardTitle className="text-sm font-medium">Print Label Cart</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Printer className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-6">
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{count}</span>
                        <span className="text-sm text-muted-foreground">items pending</span>
                    </div>
                    
                    {lastItem ? (
                        <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs border border-dashed">
                            <span className="text-muted-foreground">Last added:</span>
                            <div className="font-medium text-foreground mt-1 truncate" title={lastItem}>
                                {lastItem}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 p-3 bg-muted/20 rounded-md text-xs border border-dashed text-center text-muted-foreground">
                            Cart is empty
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href="/label-cart">
                            <ShoppingCart className="mr-2 h-3.5 w-3.5" />
                            View Cart
                        </Link>
                    </Button>
                    <Button asChild size="sm" className="w-full">
                        <Link href="/label-cart">
                            <Printer className="mr-2 h-3.5 w-3.5" />
                            Print Now
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
