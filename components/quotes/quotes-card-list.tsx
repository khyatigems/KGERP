import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface QuoteItem {
  id: string;
  quotationNumber: string;
  createdAt: Date;
  customerName: string | null;
  customerMobile: string | null;
  totalAmount: number;
  status: string;
  expiryDate: Date;
  token: string;
  _count: { items: number };
}

interface QuotesCardListProps {
  data: QuoteItem[];
}

export function QuotesCardList({ data }: QuotesCardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {data.map((quote) => (
        <div key={quote.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
           <div className="flex justify-between items-start">
             <div>
                <p className="font-semibold">{quote.customerName}</p>
                <p className="text-xs text-muted-foreground">{quote.quotationNumber}</p>
             </div>
             <Badge
                variant={
                quote.status === "ACTIVE"
                    ? "default"
                    : quote.status === "CONVERTED"
                    ? "secondary"
                    : "outline"
                }
            >
                {quote.status}
            </Badge>
           </div>

           <div className="grid grid-cols-2 gap-2 text-sm">
             <div>
                <span className="text-muted-foreground text-xs block">Date</span>
                <span>{formatDate(quote.createdAt)}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Expiry</span>
                <span>{formatDate(quote.expiryDate)}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Items</span>
                <span>{quote._count.items}</span>
             </div>
             <div>
                <span className="text-muted-foreground text-xs block">Total</span>
                <span className="font-bold">{formatCurrency(quote.totalAmount)}</span>
             </div>
           </div>

           <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/quote/${quote.token}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" /> View Quote
                </Link>
              </Button>
           </div>
        </div>
      ))}
    </div>
  );
}
