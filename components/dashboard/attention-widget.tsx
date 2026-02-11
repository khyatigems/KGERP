import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, FileText, User, ShieldAlert, Receipt, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface AttentionData {
    quotations: Array<{ id: string; quotationNumber: string; customerName: string; expiryDate: string | null }>;
    invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; createdAt: string }>;
    memo: Array<{ id: string; inventory: { sku: string }; memo: { customerName: string; issueDate: string } }>;
    vendors: number;
    unsold?: Array<{ id: string; sku: string; createdAt: string }>;
    missingCertifications?: Array<{ id: string; sku: string; itemName: string }>;
    pendingExpenses?: Array<{ id: string; description: string; totalAmount: number; expenseDate: string }>;
    highValueUnsold?: Array<{ id: string; sku: string; sellingPrice: number }>;
}

export function AttentionWidget({ data }: { data: AttentionData }) {
    if (!data) return null;

    const hasItems = 
        data.quotations.length > 0 || 
        data.invoices.length > 0 || 
        data.memo.length > 0 || 
        data.vendors > 0 || 
        (data.unsold && data.unsold.length > 0) ||
        (data.missingCertifications && data.missingCertifications.length > 0) ||
        (data.pendingExpenses && data.pendingExpenses.length > 0) ||
        (data.highValueUnsold && data.highValueUnsold.length > 0);

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
                    <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <p className="font-medium text-stone-900">Everything is under control!</p>
                        <p className="text-xs">No immediate actions or alerts detected at this moment.</p>
                    </div>
                )}

                {/* Expiring Quotations */}
                {data.quotations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                            Expiring Quotations (7 Days)
                        </h4>
                        {data.quotations.map(q => (
                            <Link href={`/quotes/${q.id}`} key={q.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-amber-50/50 hover:bg-amber-50 border border-amber-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="font-medium text-amber-900 group-hover:underline">{q.quotationNumber}</span>
                                        <span className="text-amber-700 truncate max-w-[120px]">- {q.customerName}</span>
                                    </div>
                                    <span className="text-xs text-amber-600 font-medium">
                                        Exp: {q.expiryDate ? format(new Date(q.expiryDate), "dd MMM") : "N/A"}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pending Expenses */}
                {data.pendingExpenses && data.pendingExpenses.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                            Pending Expense Payments
                        </h4>
                        {data.pendingExpenses.map(exp => (
                            <Link href={`/expenses`} key={exp.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-violet-50/50 hover:bg-violet-50 border border-violet-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="h-3.5 w-3.5 text-violet-600" />
                                        <span className="font-medium text-violet-900 truncate max-w-[150px]">{exp.description}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-violet-700">{formatCurrency(exp.totalAmount)}</span>
                                        <span className="text-xs text-violet-600">
                                            {format(new Date(exp.expenseDate), "dd MMM")}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Missing Certifications */}
                {data.missingCertifications && data.missingCertifications.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                            Missing Lab Certification
                        </h4>
                        {data.missingCertifications.map(item => (
                            <Link href={`/inventory/${item.id}`} key={item.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                                        <span className="font-medium text-blue-900 group-hover:underline">{item.sku}</span>
                                        <span className="text-blue-700 truncate max-w-[150px]">- {item.itemName}</span>
                                    </div>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">MISSING CERT</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Overdue Invoices */}
                {data.invoices.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-red-500" />
                            Overdue Invoices (15+ Days)
                        </h4>
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
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-orange-500" />
                            Overdue Memo Items (15+ Days)
                        </h4>
                        {data.memo.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-orange-50/50 border border-orange-100/50">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                                    <span className="font-medium text-orange-900">{m.inventory.sku}</span>
                                    <span className="text-orange-700 truncate max-w-[150px]">- {m.memo.customerName}</span>
                                </div>
                                <span className="text-xs text-orange-600">
                                    {format(new Date(m.memo.issueDate), "dd MMM")}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* High Value Unsold */}
                {data.highValueUnsold && data.highValueUnsold.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-500" />
                            High Value Stagnant Stock (&gt;60 Days)
                        </h4>
                        {data.highValueUnsold.map(item => (
                            <Link href={`/inventory/${item.id}`} key={item.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-rose-50/50 hover:bg-rose-50 border border-rose-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                                        <span className="font-medium text-rose-900 group-hover:underline">{item.sku}</span>
                                    </div>
                                    <span className="font-mono text-xs text-rose-700 font-bold">{formatCurrency(item.sellingPrice)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pending Vendors */}
                {data.vendors > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            Vendor Management
                        </h4>
                        <Link href="/vendors" className="block">
                            <div className="flex items-center justify-between text-sm p-2 rounded-md bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="font-medium text-emerald-900">{data.vendors} Vendors Pending Approval</span>
                                </div>
                                <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Review</span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Unsold Inventory */}
                {data.unsold && data.unsold.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-stone-500" />
                            Stagnant Stock (90+ Days)
                        </h4>
                         {data.unsold.map(item => (
                            <Link href={`/inventory/${item.id}`} key={item.id} className="block group">
                                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-stone-50/50 hover:bg-stone-50 border border-stone-100/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-stone-500" />
                                        <span className="font-medium text-stone-900 group-hover:underline">{item.sku}</span>
                                    </div>
                                    <span className="text-[10px] text-stone-500 font-medium">
                                        {format(new Date(item.createdAt), "dd MMM yyyy")}
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
