import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp, Boxes, CircleDollarSign, Percent, Activity, Package, PieChart, FileText, FileCheck, Printer, Lock, CreditCard, ReceiptIndianRupee, QrCode, ListChecks } from "lucide-react";
import Link from "next/link";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportJobCenter } from "@/components/reports/export-job-center";
import { getGovernanceConfig } from "@/lib/governance";

export default async function ReportsHubPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

    const canViewFinancials = hasPermission(session.user.role, PERMISSIONS.REPORTS_FINANCIAL);
    const canViewExpenses = hasPermission(session.user.role, PERMISSIONS.EXPENSE_REPORT);
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const monthStartUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0));

    const latestSnapshot = await prisma.analyticsDailySnapshot.findFirst({ orderBy: { snapshotDate: "desc" } });

    const [salesTodayCount, salesMonthCount, avgSale, paidInvoices, pendingInvoices, activeListings, listingBreakdown, marginCategory, lowMarginCategory, avgMarginSnapshot] = await Promise.all([
        prisma.sale.count({ where: { saleDate: { gte: todayUtc } } }),
        prisma.sale.count({ where: { saleDate: { gte: monthStartUtc } } }),
        prisma.sale.aggregate({ _avg: { netAmount: true }, where: { saleDate: { gte: monthStartUtc } } }),
        prisma.invoice.count({ where: { paymentStatus: "PAID", isActive: true } }),
        prisma.invoice.count({ where: { paymentStatus: { not: "PAID" }, isActive: true } }),
        prisma.listing.count({ where: { status: "ACTIVE" } }),
        prisma.listing.groupBy({ by: ["platform"], where: { status: "ACTIVE" }, _count: { id: true } }),
        prisma.analyticsSalesSnapshot.groupBy({ by: ["category"], _avg: { profitAmount: true }, orderBy: { _avg: { profitAmount: "desc" } }, take: 1 }),
        prisma.analyticsSalesSnapshot.groupBy({ by: ["category"], _avg: { profitAmount: true }, orderBy: { _avg: { profitAmount: "asc" } }, take: 1 }),
        prisma.analyticsSalesSnapshot.aggregate({ _avg: { profitAmount: true } }),
    ]);

    const recentSales = await prisma.sale.findMany({
        orderBy: { saleDate: "desc" },
        take: 5,
        select: {
            id: true,
            netAmount: true,
            customerName: true,
            inventory: { select: { sku: true } },
            invoice: { select: { invoiceNumber: true } }
        }
    });
    const slowMoving = await prisma.analyticsInventorySnapshot.findMany({
        where: { status: "IN_STOCK" },
        orderBy: { daysInStock: "desc" },
        take: 5
    });
    const pendingPaymentsRows = await prisma.invoice.findMany({
        where: { paymentStatus: { not: "PAID" }, isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            sales: { take: 1, select: { customerName: true } }
        }
    });
    const recentLabelJobs = await prisma.labelPrintJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
            id: true,
            totalItems: true,
            status: true,
            user: { select: { name: true } }
        }
    });

    const collectionRate = paidInvoices + pendingInvoices > 0 ? (paidInvoices / (paidInvoices + pendingInvoices)) * 100 : 0;
    const governanceConfig = await getGovernanceConfig();
    const [recentFreezeBlocks, totalFreezeBlocks] = await Promise.all([
        prisma.activityLog.count({
            where: {
                entityType: "Governance",
                actionType: "FREEZE_BLOCKED",
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        }),
        prisma.activityLog.count({ where: { entityType: "Governance", actionType: "FREEZE_BLOCKED" } })
    ]);
    const reportHealthChecks = await Promise.allSettled([
        prisma.inventory.count(),
        prisma.sale.count(),
        prisma.invoice.count(),
        prisma.payment.count(),
        prisma.activityLog.count(),
    ]);
    const healthPassed = reportHealthChecks.filter((r) => r.status === "fulfilled").length;
    const healthTotal = reportHealthChecks.length;
    const reports = [
        { title: "Inventory Reports", description: "Stock levels, aging, category breakdown", icon: Package, href: "/reports/inventory", allowed: true },
        { title: "Sales Reports", description: "Revenue, platform performance, top SKUs", icon: TrendingUp, href: "/reports/sales", allowed: true },
        { title: "Profit & Margin", description: "Net profit, SKU margins, platform margins", icon: PieChart, href: "/reports/profit", allowed: canViewFinancials },
        { title: "Quotation Analytics", description: "Conversion rates, sent vs expired", icon: FileText, href: "/reports/quotations", allowed: true },
        { title: "Invoice Reports", description: "Paid/Unpaid status, outstanding aging", icon: FileCheck, href: "/reports/invoices", allowed: true },
        { title: "Inventory Aging", description: "Days-in-stock buckets and capital lock visibility", icon: Package, href: "/reports/inventory-aging", allowed: true },
        { title: "Capital Rotation", description: "Sell-cycle and money velocity intelligence", icon: TrendingUp, href: "/reports/capital-rotation", allowed: true },
        { title: "Certificate Checklist", description: "SKU-wise missing fields for certificate readiness", icon: ListChecks, href: "/reports/certificate-readiness", allowed: true },
        { title: "Customer Intelligence", description: "Repeat customer behavior and ticket-size analytics", icon: TrendingUp, href: "/reports/customer-intelligence", allowed: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role) },
        { title: "Payment Reports", description: "Payment trends, method distribution, recent transactions", icon: CreditCard, href: "/reports/payments", allowed: true },
        { title: "Expense Reports", description: "Category-wise, Vendor-wise, GST breakdown", icon: ReceiptIndianRupee, href: "/reports/expenses", allowed: canViewExpenses },
        { title: "Label & Ops", description: "Printing activity, user logs", icon: Printer, href: "/reports/ops", allowed: true },
        { title: "QR Scans Report", description: "Track QR code usage and scan activity", icon: QrCode, href: "/reports/qr-scans", allowed: true }
    ];
    const reportModules = [
        { title: "Inventory Intelligence", color: "text-blue-600", description: "Track stock performance and aging.", links: [{ label: "Inventory Summary", href: "/reports/inventory" }, { label: "Inventory Aging", href: "/reports/inventory-aging" }, { label: "Vendor Inventory", href: "/reports/vendor-inventory" }, { label: "Category Stock", href: "/reports/category-stock" }] },
        { title: "Sales Performance", color: "text-green-600", description: "Understand product sales velocity.", links: [{ label: "Sales Report", href: "/reports/sales" }, { label: "Turnover Report", href: "/reports/turnover-report" }, { label: "Top Categories", href: "/reports/top-categories" }, { label: "Sales Cycle", href: "/reports/sales-cycle" }] },
        { title: "Financial Reports", color: "text-yellow-600", description: "Revenue and profitability analytics.", links: [{ label: "Profit & Margins", href: "/reports/profit" }, { label: "Payments", href: "/reports/payments" }, { label: "Invoice Analytics", href: "/reports/invoices" }, { label: "Expenses", href: "/reports/expenses" }] },
        { title: "Vendor Intelligence", color: "text-purple-600", description: "Track supplier performance.", links: [{ label: "Vendor Purchases", href: "/reports/vendor-purchases" }, { label: "Vendor Inventory", href: "/reports/vendor-inventory" }, { label: "Vendor Dependency", href: "/reports/vendor-dependency" }] },
        { title: "Operations Reports", color: "text-orange-600", description: "Operational insights.", links: [{ label: "Label Printing", href: "/reports/label-printing" }, { label: "User Activity", href: "/reports/user-activity" }, { label: "System Logs", href: "/reports/system-logs" }] },
        { title: "Customer Intelligence", color: "text-rose-600", description: "Lifecycle and repeat-customer insights.", links: [{ label: "Customer Intelligence", href: "/reports/customer-intelligence" }, { label: "Top Customers", href: "/reports/top-customers" }, { label: "Purchase Timeline", href: "/reports/purchase-timeline" }] },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports Dashboard</h2>
                    <p className="text-sm text-muted-foreground">Analytics Command Center for operational and financial intelligence.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto">
                    <Select defaultValue="30d"><SelectTrigger><SelectValue placeholder="Date Range" /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 Days</SelectItem><SelectItem value="30d">Last 30 Days</SelectItem><SelectItem value="90d">Last 90 Days</SelectItem></SelectContent></Select>
                    <Input placeholder="Category" />
                    <Input placeholder="Vendor" />
                    <Input placeholder="Platform" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Inventory Health</CardTitle><Boxes className="h-4 w-4 text-blue-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Items in Stock: <span className="font-semibold">{latestSnapshot?.inventoryCount ?? 0}</span></div><div>Inventory Value: <span className="font-semibold">{formatCurrency(latestSnapshot?.inventoryValueSell ?? 0)}</span></div><div>Slow Moving: <span className="font-semibold">{slowMoving.length}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Sales Performance</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Sales Today: <span className="font-semibold">{salesTodayCount}</span></div><div>Sales This Month: <span className="font-semibold">{salesMonthCount}</span></div><div>Avg Sale Price: <span className="font-semibold">{formatCurrency(avgSale._avg.netAmount || 0)}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Payments Status</CardTitle><CircleDollarSign className="h-4 w-4 text-yellow-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Paid Invoices: <span className="font-semibold">{paidInvoices}</span></div><div>Pending Payments: <span className="font-semibold">{pendingInvoices}</span></div><div>Collection Rate: <span className="font-semibold">{collectionRate.toFixed(1)}%</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Profit Insights</CardTitle><Percent className="h-4 w-4 text-amber-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Avg Margin: <span className="font-semibold">{formatCurrency(avgMarginSnapshot._avg.profitAmount || 0)}</span></div><div>Highest Category: <span className="font-semibold">{marginCategory[0]?.category || "-"}</span></div><div>Lowest Category: <span className="font-semibold">{lowMarginCategory[0]?.category || "-"}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Listings Overview</CardTitle><Activity className="h-4 w-4 text-purple-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Active Listings: <span className="font-semibold">{activeListings}</span></div>{listingBreakdown.slice(0, 3).map((row: { platform: string; _count: { id: number } }) => (<div key={row.platform}>{row.platform}: <span className="font-semibold">{row._count.id}</span></div>))}</CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Governance Monitoring</CardTitle></CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
                    <div>Freeze Status: <span className="font-semibold">{governanceConfig.freezeMode ? "ON" : "OFF"}</span></div>
                    <div>Blocked Attempts (24h): <span className="font-semibold">{recentFreezeBlocks}</span></div>
                    <div>Total Blocked Attempts: <span className="font-semibold">{totalFreezeBlocks}</span></div>
                    <div>Health Summary: <span className="font-semibold">{healthPassed}/{healthTotal} checks passed</span></div>
                    <div><Link className="text-primary underline" href="/api/governance/status">View Governance Status API</Link></div>
                    <div><Link className="text-primary underline" href="/api/reports/health">View Reports Health API</Link></div>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {reportModules.map((module) => (
                    <Card key={module.title}>
                        <CardHeader><CardTitle className={module.color}>{module.title}</CardTitle><CardDescription>{module.description}</CardDescription></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {module.links.map((link) => (<Button key={link.label} asChild variant="outline" size="sm"><Link href={link.href}>{link.label}</Link></Button>))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card><CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>User</TableHead></TableRow></TableHeader><TableBody>{recentSales.map((sale) => (<TableRow key={sale.id}><TableCell>{sale.invoice?.invoiceNumber || "-"}</TableCell><TableCell>{sale.inventory.sku}</TableCell><TableCell className="text-right">{formatCurrency(sale.netAmount || 0)}</TableCell><TableCell>{sale.customerName || "-"}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                <Card><CardHeader><CardTitle>Slow Moving Inventory</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Days</TableHead></TableRow></TableHeader><TableBody>{slowMoving.map((item: { id: string; sku: string; itemName: string; daysInStock: number }) => (<TableRow key={item.id}><TableCell>{item.sku}</TableCell><TableCell>{item.itemName}</TableCell><TableCell className="text-right">{item.daysInStock}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                <Card><CardHeader><CardTitle>Pending Payments</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{pendingPaymentsRows.map((row: { invoiceNumber: string; totalAmount: number; paidAmount: number | null; sales: Array<{ customerName: string | null }> }) => (<TableRow key={row.invoiceNumber}><TableCell>{row.invoiceNumber}</TableCell><TableCell>{row.sales[0]?.customerName || "-"}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.totalAmount - (row.paidAmount || 0)))}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                <Card><CardHeader><CardTitle>Recent Label Jobs</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Printed By</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Labels</TableHead></TableRow></TableHeader><TableBody>{recentLabelJobs.map((job: { id: string; totalItems: number; status: string; user: { name: string | null } }) => (<TableRow key={job.id}><TableCell>{job.id.slice(0, 8)}</TableCell><TableCell>{job.user.name || "-"}</TableCell><TableCell><Badge variant="outline">{job.status}</Badge></TableCell><TableCell className="text-right">{job.totalItems}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            </div>

            <ExportJobCenter />

            <div className="space-y-2">
                <h3 className="text-xl font-semibold">Report Navigation</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => (
                        <Link key={report.title} href={report.allowed ? report.href : "#"} className={!report.allowed ? "cursor-not-allowed opacity-60 pointer-events-none" : ""} aria-disabled={!report.allowed}>
                            <Card className="h-full hover:bg-muted/50 transition-colors">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <report.icon className={`h-8 w-8 ${report.allowed ? "text-primary" : "text-muted-foreground"}`} />
                                        {!report.allowed && <Lock className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                    <CardTitle className="mt-4">{report.title}</CardTitle>
                                    <CardDescription>{report.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
