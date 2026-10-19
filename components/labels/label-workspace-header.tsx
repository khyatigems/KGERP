import type { ComponentProps } from "react";
import { Barcode, Gem, History, Printer, ShoppingCart } from "lucide-react";
import { LabelCartSheet } from "@/components/labels/label-cart-sheet";

export function LabelWorkspaceHeader({ availableProducts, recentJobs, cartItems = [] }: {
    availableProducts: number;
    recentJobs: number;
    cartItems: ComponentProps<typeof LabelCartSheet>["initialItems"];
}) {
    return (
      <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-card to-card shadow-sm">
        <Barcode aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 size-60 -rotate-12 text-primary/[0.04]" strokeWidth={1} />
        <div className="relative flex flex-wrap items-start justify-between gap-5 px-6 py-5">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" />KhyatiGems · Print workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">Label management</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">Select gemstones, check the measured layout, and print a batch that fits your stock.</p>
          </div>
          <div className="space-y-3 pt-1"><LabelCartSheet initialItems={cartItems} /><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Printer className="size-3.5" />Exeo 9250 · Thermal printing</p></div>
        </div>
        <div className="relative grid grid-cols-1 divide-y border-t bg-background/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[{ label: "Available products", value: availableProducts, icon: Gem }, { label: "In your print queue", value: cartItems.length, icon: ShoppingCart }, { label: "Recent print jobs", value: recentJobs, icon: History }].map(stat => <div key={stat.label} className="flex items-center gap-3 px-6 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl border bg-card/80 text-muted-foreground"><stat.icon className="size-4" /></div><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{stat.value.toLocaleString("en-IN")}</p></div></div>)}
        </div>
      </section>
    );
}
