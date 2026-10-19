"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getCart, removeFromCart, clearCart } from "@/app/(dashboard)/labels/actions";
import { ShoppingCart, Trash2, Printer, Search, RefreshCw } from "lucide-react";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { toLabelItem } from "@/lib/label-items";
import { toast } from "sonner";
import type { LabelCartItem, Inventory, ColorCode } from "@prisma/client";

type CartItemWithInventory = LabelCartItem & { inventory: Inventory & { colorCode: ColorCode | null } };
const EMPTY_CART: CartItemWithInventory[] = [];

export function LabelCartSheet({ initialItems = EMPTY_CART }: { initialItems?: CartItemWithInventory[] }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(initialItems);
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState("");
    const [excluded, setExcluded] = useState<Set<string>>(new Set());
    const loadCart = useCallback(async () => {
        setBusy(true);
        try { setItems(await getCart() as CartItemWithInventory[]); }
        catch { toast.error("Unable to refresh the label cart"); }
        finally { setBusy(false); }
    }, []);
    useEffect(() => { setItems(initialItems); }, [initialItems]);
    useEffect(() => { if (open) void loadCart(); }, [open, loadCart]);
    useEffect(() => {
        const refresh = () => { void loadCart(); };
        window.addEventListener("label-cart-updated", refresh);
        return () => window.removeEventListener("label-cart-updated", refresh);
    }, [loadCart]);
    const filtered = useMemo(() => items.filter(item => `${item.inventory.sku} ${item.inventory.itemName} ${item.inventory.internalName || ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
    const selected = items.filter(item => !excluded.has(item.id));
    const removeItems = async (ids: string[]) => {
        setBusy(true);
        try {
            const results = await Promise.all(ids.map(id => removeFromCart(id)));
            if (results.some(result => !result.success)) throw new Error("Some items could not be removed. Refresh and try again.");
            setItems(previous => previous.filter(item => !ids.includes(item.id)));
            toast.success("Label cart updated");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update cart"); }
        finally { setBusy(false); }
    };
    const clear = async () => {
        setBusy(true);
        try {
            const result = await clearCart();
            if (!result.success) throw new Error("Unable to clear cart");
            setItems([]);
        } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to clear cart"); }
        finally { setBusy(false); }
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline"><ShoppingCart className="mr-2 h-4 w-4" />Label cart <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{items.length}</span></Button></DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="p-6 border-b pr-12">
                    <DialogTitle>Label print queue</DialogTitle>
                    <DialogDescription>Review products, choose a batch, then check the measured preview before printing.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 border-b bg-muted/30 px-6 py-4">
                    <div><p className="text-xs text-muted-foreground">Queued products</p><p className="text-xl font-semibold">{items.length}</p></div>
                    <div><p className="text-xs text-muted-foreground">Selected for print</p><p className="text-xl font-semibold">{selected.length}</p></div>
                    <div><p className="text-xs text-muted-foreground">Printer</p><p className="font-medium mt-1">Exeo 9250</p></div>
                </div>
                <div className="flex flex-wrap gap-3 px-6 py-4">
                    <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search label cart" placeholder="Find SKU, product or internal name" className="pl-9" value={query} onChange={event => setQuery(event.target.value)} /></div>
                    <Button variant="outline" disabled={busy} onClick={loadCart}><RefreshCw className={`mr-2 size-4 ${busy ? "animate-spin" : ""}`} />Refresh</Button>
                    <Button variant="outline" disabled={busy || !filtered.length} onClick={() => setExcluded(previous => {
                        const next = new Set(previous);
                        const allSelected = filtered.every(item => !next.has(item.id));
                        filtered.forEach(item => allSelected ? next.add(item.id) : next.delete(item.id));
                        return next;
                    })}>Toggle visible selection</Button>
                </div>
                <div className="min-h-40 overflow-auto px-6 pb-4">
                    {!filtered.length ? <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{items.length ? "No matching products." : "Your queue is empty. Add products from Manage Labels."}</div> : (
                        <table className="w-full text-sm"><thead className="sticky top-0 bg-background"><tr className="text-left text-muted-foreground border-b"><th className="p-3">Print</th><th className="p-3">Product / SKU</th><th className="p-3">Weight</th><th className="p-3">Location</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>
                        {filtered.map(item => <tr key={item.id} className="border-b last:border-0"><td className="p-3"><Checkbox aria-label={`Select ${item.inventory.sku}`} checked={!excluded.has(item.id)} onCheckedChange={checked => setExcluded(previous => { const next = new Set(previous); if (checked) next.delete(item.id); else next.add(item.id); return next; })} /></td><td className="p-3"><p className="font-medium">{item.inventory.itemName}</p><p className="font-mono text-xs text-muted-foreground mt-1">{item.inventory.sku}</p>{item.inventory.internalName && <p className="text-xs text-muted-foreground">Internal: {item.inventory.internalName}</p>}</td><td className="p-3 whitespace-nowrap">{item.inventory.weightValue} {item.inventory.weightUnit}</td><td className="p-3">{item.inventory.stockLocation || "—"}</td><td className="p-3"><Button variant="ghost" size="icon" disabled={busy} aria-label={`Remove ${item.inventory.sku}`} onClick={() => removeItems([item.id])}><Trash2 className="size-4 text-destructive" /></Button></td></tr>)}
                        </tbody></table>
                    )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5 bg-muted/20">
                    <Button variant="ghost" disabled={busy || !items.length} onClick={clear}>Clear queue</Button>
                    <div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Continue selecting</Button><LabelPrintDialog items={selected.map(item => toLabelItem(item.inventory))} onPrintComplete={() => { void loadCart(); setOpen(false); }} trigger={<Button disabled={busy || !selected.length}><Printer className="mr-2 size-4" />Preview {selected.length} labels</Button>} /></div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
