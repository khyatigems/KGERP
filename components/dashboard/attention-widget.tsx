"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, FileText, User, ShieldAlert, Receipt, TrendingDown, EyeOff, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { applyAttentionVisibilityFilters } from "@/lib/attention-widget-visibility";
import { toast } from "sonner";

interface AttentionData {
    quotations: Array<{ id: string; quotationNumber: string; customerName: string; expiryDate: string | null }>;
    invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; createdAt: string }>;
    memo: Array<{ id: string; inventory: { sku: string }; memo: { customerName: string; issueDate: string } }>;
    vendors: number;
    unsold?: Array<{ id: string; sku: string; createdAt: string }>;
    missingCertifications?: Array<{ id: string; sku: string; itemName: string; lab?: string | null }>;
    missingImages?: Array<{ id: string; sku: string; itemName: string }>;
    pendingExpenses?: Array<{ id: string; description: string; totalAmount: number; expenseDate: string }>;
    highValueUnsold?: Array<{ id: string; sku: string; sellingPrice: number }>;
}

type AlertCategory =
  | "quotations" | "invoices" | "memo" | "vendors" | "unsold"
  | "missingCertifications" | "missingImages" | "pendingExpenses" | "highValueUnsold";

export function AttentionWidget({ data }: { data: AttentionData }) {
    const [hideMissingCertifications, setHideMissingCertifications] = useState(false);
    const [hideMissingImages, setHideMissingImages] = useState(false);
    const [optimisticHiddenSkus, setOptimisticHiddenSkus] = useState<Set<string>>(new Set());
    const [isUpdatingSku, setIsUpdatingSku] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<AlertCategory | null>(null);

    useEffect(() => {
        const certPref = localStorage.getItem("dashboard-hide-missing-certifications");
        const imagePref = localStorage.getItem("dashboard-hide-missing-images");
        setHideMissingCertifications(certPref === "1");
        setHideMissingImages(imagePref === "1");
    }, []);

    const {
        missingCertifications: visibleMissingCertifications,
        missingImages: visibleMissingImages,
        unsold: visibleUnsold,
        highValueUnsold: visibleHighValueUnsold,
        memo: visibleMemo,
        hasItems
    } = useMemo(
        () =>
            applyAttentionVisibilityFilters(data, {
                hideMissingCertifications,
                hideMissingImages,
                runtimeHiddenSkuIds: optimisticHiddenSkus
            }),
        [data, hideMissingCertifications, hideMissingImages, optimisticHiddenSkus]
    );

    const hideSkuFromAttention = async (inventoryId: string, sku: string) => {
        if (isUpdatingSku) return;
        setIsUpdatingSku(sku);
        try {
            const response = await fetch(`/api/inventory/${inventoryId}/attention-visibility`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hideFromAttention: true })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || "Failed to hide SKU from attention widget");
            }
            setOptimisticHiddenSkus((prev) => new Set([...Array.from(prev), sku]));
            localStorage.setItem("attention-visibility-last-change", Date.now().toString());
            window.dispatchEvent(new Event("attention-visibility-changed"));
            toast.success(`${sku} hidden from attention widget`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to hide SKU from attention widget");
        } finally {
            setIsUpdatingSku(null);
        }
    };

    const toggleMissingCertifications = () => {
        const next = !hideMissingCertifications;
        setHideMissingCertifications(next);
        localStorage.setItem("dashboard-hide-missing-certifications", next ? "1" : "0");
    };

    const toggleMissingImages = () => {
        const next = !hideMissingImages;
        setHideMissingImages(next);
        localStorage.setItem("dashboard-hide-missing-images", next ? "1" : "0");
    };

    const activeCategories: Array<{
        key: AlertCategory;
        label: string;
        count: number;
        icon: React.ReactNode;
        color: string;
        bgClass: string;
        borderClass: string;
        textClass: string;
        badgeClass: string;
    }> = [
        ...(data.quotations.length > 0 ? [{
            key: "quotations" as const,
            label: "Expiring Quotations",
            count: data.quotations.length,
            icon: <FileText className="h-4 w-4" />,
            color: "amber",
            bgClass: "bg-amber-50 dark:bg-amber-950/20",
            borderClass: "border-amber-200 dark:border-amber-800",
            textClass: "text-amber-700 dark:text-amber-300",
            badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        }] : []),
        ...(data.pendingExpenses && data.pendingExpenses.length > 0 ? [{
            key: "pendingExpenses" as const,
            label: "Pending Expenses",
            count: data.pendingExpenses.length,
            icon: <Receipt className="h-4 w-4" />,
            color: "violet",
            bgClass: "bg-violet-50 dark:bg-violet-950/20",
            borderClass: "border-violet-200 dark:border-violet-800",
            textClass: "text-violet-700 dark:text-violet-300",
            badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
        }] : []),
        ...(visibleMissingCertifications.length > 0 ? [{
            key: "missingCertifications" as const,
            label: "Missing Certification",
            count: visibleMissingCertifications.length,
            icon: <ShieldAlert className="h-4 w-4" />,
            color: "blue",
            bgClass: "bg-blue-50 dark:bg-blue-950/20",
            borderClass: "border-blue-200 dark:border-blue-800",
            textClass: "text-blue-700 dark:text-blue-300",
            badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        }] : []),
        ...(visibleMissingImages.length > 0 ? [{
            key: "missingImages" as const,
            label: "Missing Images",
            count: visibleMissingImages.length,
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "rose",
            bgClass: "bg-rose-50 dark:bg-rose-950/20",
            borderClass: "border-rose-200 dark:border-rose-800",
            textClass: "text-rose-700 dark:text-rose-300",
            badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
        }] : []),
        ...(data.invoices.length > 0 ? [{
            key: "invoices" as const,
            label: "Overdue Invoices",
            count: data.invoices.length,
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "red",
            bgClass: "bg-red-50 dark:bg-red-950/20",
            borderClass: "border-red-200 dark:border-red-800",
            textClass: "text-red-700 dark:text-red-300",
            badgeClass: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        }] : []),
        ...(visibleMemo.length > 0 ? [{
            key: "memo" as const,
            label: "Overdue Memo Items",
            count: visibleMemo.length,
            icon: <Clock className="h-4 w-4" />,
            color: "orange",
            bgClass: "bg-orange-50 dark:bg-orange-950/20",
            borderClass: "border-orange-200 dark:border-orange-800",
            textClass: "text-orange-700 dark:text-orange-300",
            badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        }] : []),
        ...(visibleHighValueUnsold.length > 0 ? [{
            key: "highValueUnsold" as const,
            label: "High Value Stagnant",
            count: visibleHighValueUnsold.length,
            icon: <TrendingDown className="h-4 w-4" />,
            color: "rose",
            bgClass: "bg-rose-50 dark:bg-rose-950/20",
            borderClass: "border-rose-200 dark:border-rose-800",
            textClass: "text-rose-700 dark:text-rose-300",
            badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
        }] : []),
        ...(data.vendors > 0 ? [{
            key: "vendors" as const,
            label: "Pending Vendors",
            count: data.vendors,
            icon: <User className="h-4 w-4" />,
            color: "emerald",
            bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
            borderClass: "border-emerald-200 dark:border-emerald-800",
            textClass: "text-emerald-700 dark:text-emerald-300",
            badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        }] : []),
        ...(visibleUnsold.length > 0 ? [{
            key: "unsold" as const,
            label: "Stagnant Stock",
            count: visibleUnsold.length,
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "stone",
            bgClass: "bg-stone-50 dark:bg-stone-950/20",
            borderClass: "border-stone-200 dark:border-stone-800",
            textClass: "text-muted-foreground",
            badgeClass: "bg-stone-100 text-muted-foreground dark:bg-stone-800 dark:text-muted-foreground",
        }] : []),
    ];

    const totalAlerts = activeCategories.reduce((s, c) => s + c.count, 0);

    return (
        <Card className="sass-enter">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Attention Required
                        </CardTitle>
                        {hasItems && (
                            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                                {totalAlerts}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={hideMissingCertifications ? "secondary" : "outline"}
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={toggleMissingCertifications}
                        >
                            {hideMissingCertifications ? "Show Cert Alerts" : "Hide Cert Alerts"}
                        </Button>
                        <Button
                            type="button"
                            variant={hideMissingImages ? "secondary" : "outline"}
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={toggleMissingImages}
                        >
                            {hideMissingImages ? "Show Image Alerts" : "Hide Image Alerts"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!hasItems ? (
                    <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <p className="font-medium text-foreground">Everything is under control!</p>
                        <p className="text-xs">No immediate actions or alerts detected at this moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeCategories.map((cat) => (
                            <div key={cat.key} className="rounded-lg border overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setExpandedSection(expandedSection === cat.key ? null : cat.key)}
                                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors ${cat.bgClass} hover:opacity-80`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cat.textClass}>{cat.icon}</span>
                                        <span className="text-xs font-semibold text-foreground truncate">
                                            {cat.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cat.badgeClass}`}>
                                            {cat.count}
                                        </span>
                                        {expandedSection === cat.key
                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                    </div>
                                </button>

                                {expandedSection === cat.key && (
                                    <div className="border-t divide-y">
                                        {cat.key === "quotations" && data.quotations.map(q => (
                                            <Link href={`/quotes/${q.id}`} key={q.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{q.quotationNumber}</span>
                                                    <span className="text-muted-foreground truncate">- {q.customerName}</span>
                                                </div>
                                                <span className="text-amber-600 font-medium shrink-0 text-xs">
                                                    Exp: {q.expiryDate ? format(new Date(q.expiryDate), "dd MMM") : "N/A"}
                                                </span>
                                            </Link>
                                        ))}
                                        {cat.key === "pendingExpenses" && data.pendingExpenses?.map(exp => (
                                            <Link href="/expenses" key={exp.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Receipt className="h-4 w-4 text-violet-500 shrink-0" />
                                                    <span className="font-semibold text-foreground truncate">{exp.description}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-mono text-violet-700 text-xs">{formatCurrency(exp.totalAmount)}</span>
                                                    <span className="text-muted-foreground text-xs">{format(new Date(exp.expenseDate), "dd MMM")}</span>
                                                </div>
                                            </Link>
                                        ))}
                                        {cat.key === "missingCertifications" && visibleMissingCertifications.map(item => (
                                            <Link href={`/inventory/${item.id}`} key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <ShieldAlert className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{item.sku}</span>
                                                    <span className="text-muted-foreground truncate">- {item.itemName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                                        {item.lab ? `${item.lab} MISSING` : "MISSING CERT"}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={isUpdatingSku === item.sku}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); hideSkuFromAttention(item.id, item.sku); }}
                                                    >
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </Link>
                                        ))}
                                        {cat.key === "missingImages" && visibleMissingImages.map(item => (
                                            <Link href={`/inventory/${item.id}`} key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{item.sku}</span>
                                                    <span className="text-muted-foreground truncate">- {item.itemName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">NO IMAGE</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={isUpdatingSku === item.sku}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); hideSkuFromAttention(item.id, item.sku); }}
                                                    >
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </Link>
                                        ))}
                                        {cat.key === "invoices" && data.invoices.map(inv => (
                                            <Link href={`/invoices/${inv.id}`} key={inv.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{inv.invoiceNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-mono text-red-700 text-xs">{formatCurrency(inv.totalAmount)}</span>
                                                    <span className="text-muted-foreground text-xs">{format(new Date(inv.createdAt), "dd MMM")}</span>
                                                </div>
                                            </Link>
                                        ))}
                                        {cat.key === "memo" && visibleMemo.map(m => (
                                            <div key={m.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                                                    <span className="font-semibold text-foreground truncate">{m.inventory.sku}</span>
                                                    <span className="text-muted-foreground truncate">- {m.memo.customerName}</span>
                                                </div>
                                                <span className="text-orange-600 shrink-0 text-xs">{format(new Date(m.memo.issueDate), "dd MMM")}</span>
                                            </div>
                                        ))}
                                        {cat.key === "highValueUnsold" && visibleHighValueUnsold.map(item => (
                                            <Link href={`/inventory/${item.id}`} key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <TrendingDown className="h-4 w-4 text-rose-500 shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{item.sku}</span>
                                                </div>
                                                <span className="font-mono text-rose-700 font-bold shrink-0 text-xs">{formatCurrency(item.sellingPrice)}</span>
                                            </Link>
                                        ))}
                                        {cat.key === "vendors" && (
                                            <Link href="/vendors" className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-foreground">{data.vendors} Vendors Pending Approval</span>
                                                </div>
                                                <span className="text-emerald-600 font-bold uppercase tracking-wider shrink-0 text-xs">Review</span>
                                            </Link>
                                        )}
                                        {cat.key === "unsold" && visibleUnsold.map(item => (
                                            <Link href={`/inventory/${item.id}`} key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="font-semibold text-foreground group-hover:underline truncate">{item.sku}</span>
                                                </div>
                                                <span className="text-muted-foreground shrink-0 text-xs">{format(new Date(item.createdAt), "dd MMM yyyy")}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
