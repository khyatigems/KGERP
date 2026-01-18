import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";

interface SaleWithDetails {
    id: string;
    netAmount: number;
    customerName?: string | null;
    inventory: {
        itemName: string;
    };
}

interface RecentSalesProps {
  sales: SaleWithDetails[]; 
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <div className="space-y-8">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{sale.customerName ? sale.customerName[0] : "?"}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.customerName || "Walk-in"}</p>
            <p className="text-sm text-muted-foreground">
              {sale.inventory.itemName}
            </p>
          </div>
          <div className="ml-auto font-medium">+{formatCurrency(sale.netAmount)}</div>
        </div>
      ))}
      {sales.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">No recent sales</div>
      )}
    </div>
  );
}
