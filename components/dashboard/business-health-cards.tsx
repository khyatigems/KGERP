"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface BusinessHealthProps {
  data: {
    todayOrders: number;
    listings?: { total: number };
    inventory?: { total: number };
    labelCart?: { count: number };
    quotations?: { total: number };
    readyToSell?: { count: number };
    salesThisMonth?: number;
  };
}

export function BusinessHealthCards({ data }: BusinessHealthProps) {
  const inventory = data.inventory?.total ?? 0;
  const labelCart = data.labelCart?.count ?? 0;
  const readyToSell = data.readyToSell?.count ?? 0;
  const salesThisMonth = data.salesThisMonth ?? 0;

  const cards = [
    {
      label: "Total inventory",
      value: inventory.toLocaleString("en-IN"),
      sub: "Products in stock",
      href: "/inventory",
    },
    {
      label: "Sales this month",
      value: salesThisMonth.toLocaleString("en-IN"),
      sub: salesThisMonth > 0 ? "Items sold this month" : "No sales yet",
      href: "/sales",
    },
    {
      label: "Ready to sell",
      value: readyToSell.toLocaleString("en-IN"),
      sub: "Image + cert + desc + HSN",
      href: "/inventory?filter=readyToSell",
    },
    {
      label: "Label cart",
      value: labelCart.toLocaleString("en-IN"),
      sub: labelCart > 0 ? "Pending print" : "Cart empty",
      href: "/labels",
    },
  ];

  return (
    <div className="sass-enter grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="group rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:bg-muted/40"
        >
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>

            </div>
            <div className="text-3xl font-medium tabular-nums text-foreground mb-1">
              {card.value}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{card.sub}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
