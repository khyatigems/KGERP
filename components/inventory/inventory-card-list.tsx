import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { InventoryActions } from "./inventory-actions";
import { InventoryCardMedia } from "./inventory-card-media";
import type { Inventory, InventoryMedia } from "@prisma/client-custom-v2";

interface InventoryItem extends Inventory {
  media: InventoryMedia[];
}

interface InventoryCardListProps {
  data: InventoryItem[];
}

export function InventoryCardList({ data }: InventoryCardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {data.map((item) => {
         const price = item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
          : item.flatSellingPrice || 0;

        return (
          <div key={item.id} className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm">
            <InventoryCardMedia item={item} className="h-20 w-20 shrink-0" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold line-clamp-1">{item.itemName}</h3>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  {(item.category === "Bracelets" || item.category === "Bracelet") && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {item.braceletType && <span>Type: {item.braceletType}</span>}
                        {item.standardSize && <span>Size: {item.standardSize}</span>}
                        {item.beadSizeMm && <span>Bead: {item.beadSizeMm}mm</span>}
                        {item.beadCount && <span>Count: {item.beadCount}</span>}
                    </div>
                  )}
                </div>
                <InventoryActions item={item} />
              </div>
              <div className="flex items-center justify-between mt-2">
                 <p className="text-sm font-medium">{formatCurrency(price)}</p>
                 <Badge variant={item.status === "SOLD" ? "secondary" : "default"}>
                    {item.status.replace("_", " ")}
                 </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
