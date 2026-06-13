"use client";

import { ShoppingCart, Tag, Package, Printer, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface BusinessHealthProps {
  data: {
    todayOrders: number;
    listings?: { total: number };
    inventory?: { total: number };
    labelCart?: { count: number };
  };
}

export function BusinessHealthCards({ data }: BusinessHealthProps) {
  const listings = data.listings?.total ?? 0;
  const inventory = data.inventory?.total ?? 0;
  const labelCart = data.labelCart?.count ?? 0;

  const cards = [
    {
      label: "Total Inventory",
      value: inventory.toLocaleString("en-IN"),
      sub: "Products in stock",
      icon: Package,
      accent: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      href: "/inventory",
    },
    {
      label: "Orders Today",
      value: `${data.todayOrders}`,
      sub: data.todayOrders > 0 ? "New orders received" : "No orders yet",
      icon: ShoppingCart,
      accent: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      href: "/sales",
    },
    {
      label: "Active Listings",
      value: listings.toLocaleString("en-IN"),
      sub: "Across all platforms",
      icon: Tag,
      accent: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10",
      href: "/listings",
    },
    {
      label: "Label Cart",
      value: `${labelCart}`,
      sub: labelCart > 0 ? "Pending print" : "Cart empty",
      icon: Printer,
      accent: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
      href: "/labels",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <Link
          key={card.label}
          href={card.href}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 gem-stagger-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mb-1">
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
