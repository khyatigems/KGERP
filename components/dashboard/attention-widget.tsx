import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, FileText, User } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface AttentionData {
    quotations: Array<{ id: string; quotationNumber: string; customerName: string; expiryDate: string | null }>;
    invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; createdAt: string }>;
    memo: Array<{ id: string; inventory: { sku: string }; memo: { customerName: string; issueDate: string } }>;
    vendors: number;
    unsold?: Array<{ id: string; sku: string; createdAt: string }>;
}

export function AttentionWidget({ data }: { data: AttentionData }) {
    if (!data) return null;

    const hasItems = data.quotations.length > 0 || data.invoices.length > 0 || data.memo.length > 0 || data.vendors > 0 || (data.unsold && data.unsold.length > 0);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Attention Required
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!hasItems && (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                        Everything looks good! No immediate actions required.
                    </div>
                )}

                {/* Expiring Quotations */}
                {data.quotations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiring Quotations</h4>
                        {data.quotations.map(q => (
                            <Link href={`/quotes/${q.id}`} key={q.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-amber-50/50 hover:bg-amber-50 border border-amber-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="font-medium text-amber-900 group-hover:underline">{q.quotationNumber}</span>
                                        <span className="text-amber-700">- {q.customerName}</span>
                                    </div>
                                    <span className="text-xs text-amber-600">
                                        Exp: {q.expiryDate ? format(new Date(q.expiryDate), "dd MMM") : "N/A"}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Overdue Invoices */}
                {data.invoices.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Invoices</h4>
                        {data.invoices.map(inv => (
                            <Link href={`/invoices/${inv.id}`} key={inv.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-red-50/50 hover:bg-red-50 border border-red-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                        <span className="font-medium text-red-900 group-hover:underline">{inv.invoiceNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-red-700">{formatCurrency(inv.totalAmount)}</span>
                                        <span className="text-xs text-red-600">
                                            {format(new Date(inv.createdAt), "dd MMM")}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Overdue Memo */}
                {data.memo.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Memo Items</h4>
                        {data.memo.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-orange-50/50 border border-orange-100/50">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                                    <span className="font-medium text-orange-900">{m.inventory.sku}</span>
                                    <span className="text-orange-700">- {m.memo.customerName}</span>
                                </div>
                                <span className="text-xs text-orange-600">
                                    Issued: {format(new Date(m.memo.issueDate), "dd MMM")}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pending Vendors */}
                {data.vendors > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor Actions</h4>
                        <Link href="/vendors" className="block">
                            <div className="flex items-center justify-between text-sm p-2 rounded-md bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-blue-600" />
                                    <span className="font-medium text-blue-900">{data.vendors} Vendors Pending Approval</span>
                                </div>
                                <span className="text-xs text-blue-600 font-semibold">Review</span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Unsold Inventory */}
                {data.unsold && data.unsold.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Long-Unsold Inventory</h4>
                         {data.unsold.map(item => (
                            <Link href={`/inventory/${item.id}`} key={item.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-stone-50/50 hover:bg-stone-50 border border-stone-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-stone-500" />
                                        <span className="font-medium text-stone-900 group-hover:underline">{item.sku}</span>
                                    </div>
                                    <span className="text-xs text-stone-500">
                                        Since: {format(new Date(item.createdAt), "dd MMM yyyy")}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
