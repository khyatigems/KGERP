"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type RowSelectionState, type SortingState, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { addManyToCart } from "@/app/(dashboard)/labels/actions";
import { toLabelItem } from "@/lib/label-items";
import { toast } from "sonner";
import { ArrowDownWideNarrow, ArrowUpDown, Barcode, Check, ChevronLeft, ChevronRight, Copy, Gem, Layers3, Loader2, MapPin, Printer, Search, SearchX, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import type { Inventory } from "@prisma/client";

interface InventoryWithRelations extends Inventory { colorCode?: { name: string } | null; }
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function SkuCopy({ sku }: { sku: string }) {
    const [copied, setCopied] = useState(false);
    return <button type="button" aria-label={`Copy SKU ${sku}`} className="group/sku inline-flex max-w-full items-center gap-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground" onClick={async () => {
        try { await navigator.clipboard.writeText(sku); setCopied(true); setTimeout(() => setCopied(false), 1800); }
        catch { toast.error("Unable to copy SKU. Select and copy it manually."); }
    }}><span className="font-mono break-all">{sku}</span>{copied ? <Check className="size-3 shrink-0 text-emerald-500" /> : <Copy className="size-3 shrink-0 opacity-40 group-hover/sku:opacity-100" />}</button>;
}

export function LabelsManagementTable({ data }: { data: InventoryWithRelations[] }) {
    const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [query, setQuery] = useState("");
    const [gemType, setGemType] = useState("all");
    const [location, setLocation] = useState("all");
    const [selectedOnly, setSelectedOnly] = useState(false);
    const [adding, setAdding] = useState(false);
    const types = useMemo(() => Array.from(new Set(data.map(item => item.gemType || "Unspecified"))).sort(), [data]);
    const locations = useMemo(() => Array.from(new Set(data.map(item => item.stockLocation || "No location"))).sort(), [data]);
    const matching = useMemo(() => data.filter(item => {
        const needle = query.trim().toLowerCase();
        const search = [item.sku, item.itemName, item.internalName, item.gemType, item.colorCode?.name, item.stockLocation].filter(Boolean).join(" ").toLowerCase();
        return (!needle || search.includes(needle)) && (gemType === "all" || (item.gemType || "Unspecified") === gemType) &&
            (location === "all" || (item.stockLocation || "No location") === location);
    }), [data, query, gemType, location]);
    const filtered = useMemo(() => selectedOnly ? matching.filter(item => rowSelection[item.id]) : matching, [matching, selectedOnly, rowSelection]);
    const selected = useMemo(() => data.filter(item => rowSelection[item.id]), [data, rowSelection]);
    const labelItems = useMemo(() => selected.map(item => toLabelItem(item)), [selected]);
    const columns: ColumnDef<InventoryWithRelations>[] = [
        { id: "select", header: ({ table }) => <Checkbox aria-label="Select products on this page" checked={table.getIsAllPageRowsSelected() && table.getRowModel().rows.length > 0 ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={checked => table.toggleAllPageRowsSelected(Boolean(checked))} />, cell: ({ row }) => <Checkbox aria-label={`Select ${row.original.sku}`} checked={row.getIsSelected()} onCheckedChange={checked => row.toggleSelected(Boolean(checked))} />, enableSorting: false },
        { id: "product", accessorKey: "itemName", header: ({ column }) => <button className="inline-flex items-center gap-2 hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Product & SKU<ArrowUpDown className="size-3" /></button>, cell: ({ row }) => <div className="flex items-center gap-3 py-1"><div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/5 text-primary"><Gem className="size-4" /></div><div className="min-w-0 space-y-1"><p className="font-medium leading-snug text-foreground">{row.original.itemName}</p><SkuCopy sku={row.original.sku} />{row.original.internalName && <p className="text-xs text-muted-foreground">Internal: {row.original.internalName}</p>}</div></div> },
        { accessorKey: "gemType", header: "Gemstone", cell: ({ row }) => <div className="space-y-1.5"><span className="inline-flex rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-medium">{row.original.gemType || "Unspecified"}</span><p className="text-xs text-muted-foreground">{[row.original.colorCode?.name, row.original.shape].filter(Boolean).join(" · ") || "—"}</p></div> },
        { accessorKey: "weightValue", header: ({ column }) => <button className="inline-flex items-center gap-2 hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Weight<ArrowUpDown className="size-3" /></button>, cell: ({ row }) => <div className="whitespace-nowrap"><p className="font-medium tabular-nums">{row.original.weightValue} <span className="text-xs font-normal text-muted-foreground">{row.original.weightUnit}</span></p>{row.original.weightRatti != null && <p className="mt-1 text-xs text-muted-foreground">{row.original.weightRatti.toFixed(2)} ratti</p>}</div> },
        { accessorKey: "stockLocation", header: "Stock location", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">{row.original.stockLocation && <MapPin className="size-3.5" />}{row.original.stockLocation || "Not assigned"}</span> },
        { accessorKey: "createdAt", header: "Added", cell: ({ row }) => { const date = new Date(row.original.createdAt); return <span className="whitespace-nowrap text-xs text-muted-foreground">{Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date)}</span>; } },
        { id: "preview", header: "", cell: ({ row }) => <LabelPrintDialog item={toLabelItem(row.original)} trigger={<Button variant="ghost" size="sm" aria-label={`Preview label for ${row.original.sku}`} className="gap-2"><Barcode className="size-4" /><span className="hidden xl:inline">Preview</span></Button>} /> },
    ];
    const table = useReactTable({ data: filtered, columns, state: { sorting, rowSelection }, onSortingChange: setSorting, onRowSelectionChange: setRowSelection,
        getRowId: row => row.id, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), enableRowSelection: true, autoResetPageIndex: true });
    const activeFilters = query.trim() || gemType !== "all" || location !== "all" || selectedOnly;
    const reset = () => { setQuery(""); setGemType("all"); setLocation("all"); setSelectedOnly(false); };
    const queueSelected = async () => {
        if (!selected.length || adding) return;
        setAdding(true);
        try {
            const result = await addManyToCart(selected.map(item => item.id));
            if (!result.success) throw new Error(result.message || "Unable to update label queue");
            toast.success(result.count ? `${result.count} products added to the print queue` : "Selected products are already queued");
            setRowSelection({}); setSelectedOnly(false); window.dispatchEvent(new Event("label-cart-updated"));
        } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update label queue"); }
        finally { setAdding(false); }
    };
    return <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-5 md:px-6">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-muted"><Layers3 className="size-5 text-muted-foreground" /></div><div><h2 className="font-semibold tracking-tight">Available inventory <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{data.length.toLocaleString("en-IN")}</span></h2><p className="mt-1 text-xs text-muted-foreground">Find your gemstones and prepare a batch of labels.</p></div></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={queueSelected} disabled={!selected.length || adding}>{adding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-4" />}Add to queue</Button><LabelPrintDialog items={labelItems} trigger={<Button disabled={!selected.length} className="gap-2"><Printer className="size-4" />Preview & print{selected.length > 0 && <span className="rounded bg-primary-foreground/15 px-1.5 text-xs">{selected.length}</span>}</Button>} /></div>
        </div>
        <div className="flex flex-wrap gap-3 px-5 py-4 md:px-6">
            <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search label inventory" placeholder="Search SKU, product, internal name…" value={query} onChange={event => setQuery(event.target.value)} className="h-10 rounded-lg bg-background pl-9 pr-9" />{query && <button aria-label="Clear search" className="absolute right-3 top-3 text-muted-foreground" onClick={() => setQuery("")}><X className="size-4" /></button>}</div>
            <Select value={gemType} onValueChange={setGemType}><SelectTrigger aria-label="Filter gemstone" className="h-10 w-40 rounded-lg"><Gem className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All gemstones</SelectItem>{types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
            <Select value={location} onValueChange={setLocation}><SelectTrigger aria-label="Filter location" className="h-10 w-40 rounded-lg"><MapPin className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{locations.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            <Select value={sorting[0]?.id === "createdAt" ? sorting[0].desc ? "newest" : "oldest" : sorting[0]?.id === "weightValue" ? sorting[0].desc ? "heaviest" : "lightest" : sorting[0]?.desc ? "name-desc" : "name"} onValueChange={value => setSorting([{ id: value === "newest" || value === "oldest" ? "createdAt" : value === "heaviest" || value === "lightest" ? "weightValue" : "product", desc: ["newest", "heaviest", "name-desc"].includes(value) }])}><SelectTrigger aria-label="Sort label inventory" className="h-10 w-40 rounded-lg"><ArrowDownWideNarrow className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem><SelectItem value="name">Name A–Z</SelectItem><SelectItem value="name-desc">Name Z–A</SelectItem><SelectItem value="heaviest">Heaviest first</SelectItem><SelectItem value="lightest">Lightest first</SelectItem></SelectContent></Select>
        </div>
        <div className={`flex min-h-12 flex-wrap items-center justify-between gap-2 border-y px-5 py-2 text-xs md:px-6 ${selected.length ? "bg-primary/5" : "bg-muted/20"}`}>
            <div className="flex flex-wrap items-center gap-3">{selected.length ? <><span className="inline-flex items-center gap-2 font-medium text-primary"><Check className="size-3.5" />{selected.length} selected</span><span className="text-muted-foreground">Selection is kept across pages and filters.</span><button className="text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => { setRowSelection({}); setSelectedOnly(false); }}>Clear selection</button></> : <span className="inline-flex items-center gap-2 text-muted-foreground"><SlidersHorizontal className="size-3.5" />{filtered.length.toLocaleString("en-IN")} matching products · Select rows to start a batch</span>}</div>
            <div className="flex flex-wrap items-center gap-3">{selected.length > 0 && <button className={selectedOnly ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"} aria-pressed={selectedOnly} onClick={() => setSelectedOnly(value => !value)}>Show selected only</button>}{filtered.length > 0 && <button className="font-medium text-foreground hover:underline" onClick={() => setRowSelection(previous => ({ ...previous, ...Object.fromEntries(filtered.map(item => [item.id, true])) }))}>Select all {filtered.length} results</button>}{activeFilters && <button className="text-muted-foreground hover:text-foreground" onClick={reset}>Reset filters</button>}</div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm" aria-label="Label inventory"><thead className="bg-muted/25 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => <th key={header.id} className={`px-4 py-3.5 font-medium ${header.id === "select" ? "w-12 pl-6" : header.id === "product" ? "w-[38%]" : ""}`}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody className="divide-y divide-border/60">{table.getRowModel().rows.map(row => <tr key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} className="transition-colors hover:bg-muted/25 data-[state=selected]:bg-primary/5">{row.getVisibleCells().map(cell => <td key={cell.id} className={`px-4 py-3 align-middle ${cell.column.id === "select" ? "pl-6" : ""}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table>
        {!filtered.length && <div className="grid place-items-center gap-2 px-6 py-16 text-center"><div className="mb-2 grid size-12 place-items-center rounded-2xl bg-muted"><SearchX className="size-6 text-muted-foreground" /></div><h3 className="font-medium">{data.length ? "No products match these filters" : "No inventory available for labels"}</h3><p className="max-w-sm text-sm text-muted-foreground">{data.length ? "Try a different SKU, gemstone or stock location." : "In-stock products will appear here when they are added to inventory."}</p>{activeFilters && <Button variant="outline" size="sm" className="mt-3" onClick={reset}>Clear filters</Button>}</div>}</div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-5 py-4 text-xs text-muted-foreground md:px-6"><div className="flex items-center gap-3"><span>{filtered.length ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filtered.length)} of {filtered.length}</span><Select value={String(table.getState().pagination.pageSize)} onValueChange={value => table.setPageSize(Number(value))}><SelectTrigger aria-label="Rows per page" className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50].map(size => <SelectItem value={String(size)} key={size}>{size} per page</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-3"><span>Page {Math.min(table.getState().pagination.pageIndex + 1, Math.max(1, table.getPageCount()))} of {Math.max(1, table.getPageCount())}</span><Button variant="outline" size="icon" className="size-8" aria-label="Previous inventory page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" className="size-8" aria-label="Next inventory page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="size-4" /></Button></div></div>
    </section>;
}
