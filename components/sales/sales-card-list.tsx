import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesActions } from "./sales-actions";

interface SaleItem {
  id: string;
  saleDate: Date;
  invoice: { invoiceNumber: string; token: string } | null;
  customerName: string | null;
  customerCity: string | null;
  inventory: { sku: string; itemName: string };
  platform: string;
  netAmount: number;
  profit: number;
  paymentStatus: string | null;
}

interface SalesCardListProps {
  data: SaleItem[];
  canDelete: boolean;
}

export function SalesCardList({ data, canDelete }: SalesCardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {data.map((sale) => (
        <div key={sale.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{sale.customerName || "Walk-in"}</p>
              <p className="text-xs text-muted-foreground">{sale.customerCity}</p>
            </div>
            <SalesActions 
                saleId={sale.id} 
                invoiceToken={sale.invoice?.token} 
                canDelete={canDelete} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
             <div>
                <span className="text-muted-foreground text-xs block">Date</span>
                <span>{formatDate(sale.saleDate)}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Invoice</span>
                <span>{sale.invoice?.invoiceNumber || "-"}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Item</span>
                <span>{sale.inventory.sku}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Platform</span>
                <span>{sale.platform}</span>
             </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
             <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Net Amount</span>
                <span className="font-bold">{formatCurrency(sale.netAmount)}</span>
             </div>
             <Badge variant="outline">
                {sale.paymentStatus || "PENDING"}
             </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
