"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { InventoryActions } from "./inventory-actions";
import { InventoryCardMedia } from "./inventory-card-media";
import { ExternalLink } from "lucide-react";
import type { Inventory, InventoryMedia } from "@prisma/client";

interface InventoryItem extends Inventory {
  media: InventoryMedia[];
  certificates?: { name: string; remarks?: string | null }[];
}

interface InventoryCardListProps {
  data: InventoryItem[];
  selectedIds?: string[];
  onSelectOne?: (id: string, checked: boolean) => void;
}

export function InventoryCardList({ data, selectedIds = [], onSelectOne }: InventoryCardListProps) {
  return (
    <div className="inventory-card-grid-container"><div className="inventory-compact-list">
      {data.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No inventory items found. Try changing your filters.</div>}
      {data.map((item) => {
        const price = item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
          : item.pricingMode === "PER_RATTI"
          ? (item.sellingRatePerCarat || 0) * (item.weightRatti || 0)
          : item.flatSellingPrice || 0;
        const certNames = item.certificates?.map(c => c.remarks ? `${c.name} (${c.remarks})` : c.name).join(", ");
        const rawCert = String(item.certification || "").trim();
        const certUrl = /^https?:\/\//i.test(rawCert) ? rawCert : null;
        const certNumber = String(item.certificateNo || item.certificateNumber || "").trim();
        return <article key={item.id} className="inventory-compact-item" data-selected={selectedIds.includes(item.id)}>
          <div className="flex min-w-0 gap-3">
            {onSelectOne && <Checkbox className="mt-1 shrink-0" aria-label={`Select ${item.sku}`} checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => onSelectOne(item.id, checked === true)} />}
            <InventoryCardMedia item={item} className="size-14 shrink-0 rounded-xl" width={56} height={56} />
            <div className="min-w-0 flex-1">
              <Link href={`/inventory/${item.id}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">{item.itemName}</Link>
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={item.sku}>{item.sku}</p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{[item.gemType, `${item.weightValue || 0} ${item.weightUnit || "cts"}`, item.standardSize, item.beadSizeMm ? `${item.beadSizeMm}mm beads` : null].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          {(certNames || certNumber || certUrl) && <details className="mt-2 text-[10px] text-muted-foreground"><summary className="cursor-pointer">Certificate details</summary><div className="mt-1 break-words leading-relaxed">{certNames} {certNumber && `#${certNumber}`}{certUrl && <a href={certUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary underline">View certificate <ExternalLink size={10} /></a>}</div></details>}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            <span className="min-w-0 flex-1 text-sm font-semibold tabular-nums">{formatCurrency(price)}</span>
            <Badge variant="outline" className="shrink-0 px-1.5 py-0.5 text-[9px]" data-status={item.status}>{item.status.replaceAll("_", " ")}</Badge>
            <InventoryActions item={item} compact />
          </div>
        </article>;
      })}
    </div></div>
  );
}
