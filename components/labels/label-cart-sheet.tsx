"use client";

import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getCart, removeFromCart, clearCart } from "@/app/(dashboard)/labels/actions";
import { ShoppingCart, Trash2, Printer } from "lucide-react";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { LabelItem } from "@/lib/label-generator";
import { toast } from "sonner";

export function LabelCartSheet() {
    const [open, setOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Suppress warning about setting state in effect
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const loadCart = useCallback(async () => {
        setLoading(true);
        const data = await getCart();
        setItems(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void loadCart();
        }
    }, [open, loadCart]);

    const handleRemove = async (id: string) => {
        await removeFromCart(id);
        loadCart();
        toast.success("Removed from cart");
    };

    const handleClear = async () => {
        await clearCart();
        loadCart();
        toast.success("Cart cleared");
    };

    // Map to LabelItem
    const labelItems: LabelItem[] = items.map(cartItem => {
        const item = cartItem.inventory;
        return {
            id: item.id,
            sku: item.sku,
            itemName: item.itemName,
            gemType: item.gemType || "",
            color: item.colorCode?.name || "",
            weightValue: item.weightValue || 0,
            weightUnit: item.weightUnit || "",
            weightRatti: item.weightRatti,
            sellingPrice: item.flatSellingPrice || (item.sellingRatePerCarat || 0) * (item.weightValue || 0),
            sellingRatePerCarat: item.sellingRatePerCarat,
            // pricingMode determined at print time
        };
    });

    if (!mounted) {
        return (
            <Button variant="outline" className="relative">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Cart
            </Button>
        );
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Cart
                    {items.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {items.length}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Label Cart ({items.length})</SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-full pb-10">
                    <div className="flex-1 my-4 pr-4 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-10">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">Cart is empty</div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between border-b pb-4">
                                        <div className="space-y-1">
                                            <div className="font-medium">{item.inventory.itemName}</div>
                                            <div className="text-sm font-mono text-muted-foreground">{item.inventory.sku}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2 mt-auto">
                        <Button variant="outline" className="flex-1" onClick={handleClear} disabled={items.length === 0}>
                            Clear Cart
                        </Button>
                        <LabelPrintDialog 
                            items={labelItems}
                            trigger={
                                <Button className="flex-1" disabled={items.length === 0}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print All
                                </Button>
                            }
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
