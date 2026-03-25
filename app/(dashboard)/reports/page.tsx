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
import { ExportJobCenter } from "@/components/reports/export-job-center";
import { getGovernanceConfig } from "@/lib/governance";
import { ReportsRangeSelect } from "@/components/reports/reports-range-select";

export default async function ReportsHubPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

    const canViewFinancials = hasPermission(session.user.role, PERMISSIONS.REPORTS_FINANCIAL);
    const canViewExpenses = hasPermission(session.user.role, PERMISSIONS.EXPENSE_REPORT);
    const sp = await searchParams;
    const rangeDays = (() => {
        const raw = sp.range;
        const v = Array.isArray(raw) ? raw[0] : raw;
        const n = v ? Number(v) : 30;
        if (n === 7 || n === 30 || n === 90) return n;
        return 30;
    })();

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const rangeStartUtc = new Date(todayUtc.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    const isMissingTableError = (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        return message.includes("no such table");
    };

    const renderSetup = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Reports Dashboard</h2>
                <p className="text-sm text-muted-foreground">Analytics tables are initializing. Please refresh in a minute.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Setup In Progress</CardTitle>
                    <CardDescription>Reports need analytics snapshot tables to load.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">If this persists, run the daily cron once and redeploy.</div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm"><Link href="/inventory">Inventory</Link></Button>
                        <Button asChild variant="outline" size="sm"><Link href="/sales">Sales</Link></Button>
                        <Button asChild variant="outline" size="sm"><Link href="/accounting/reports">Accounting</Link></Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    let latestSnapshot: Awaited<ReturnType<typeof prisma.analyticsDailySnapshot.findFirst>> = null;
    try {
        latestSnapshot = await prisma.analyticsDailySnapshot.findFirst({ orderBy: { snapshotDate: "desc" } });
    } catch (error) {
        if (isMissingTableError(error)) {
            return renderSetup();
        }
        throw error;
    }

    const liveInventory = await (async () => {
        try {
            const [count, sums] = await Promise.all([
                prisma.inventory.count({ where: { status: "IN_STOCK" } }),
                prisma.inventory.aggregate({ where: { status: "IN_STOCK" }, _sum: { sellingPrice: true } })
            ]);
            return { count, sellValue: sums._sum.sellingPrice || 0 };
        } catch {
            return { count: 0, sellValue: 0 };
        }
    })();

    let salesTodayCount = 0;
    let salesMonthCount = 0;
    let avgSale: { _avg: { netAmount: number | null } } = { _avg: { netAmount: 0 } };
    let paidInvoices = 0;
    let pendingInvoices = 0;
    let activeListings = 0;
    let listingBreakdown: Array<{ platform: string; _count: { id: number } }> = [];
    let recentSales: Array<{ id: string; netAmount: number | null; customerName: string | null; inventory: { sku: string }; invoice: { invoiceNumber: string } | null }> = [];
    let slowMoving: Array<{ id: string; sku: string; itemName: string; daysInStock: number }> = [];
    let pendingPaymentsRows: Array<{ invoiceNumber: string; customerName: string | null; pendingAmount: number }> = [];
    let recentLabelJobs: Array<{ id: string; totalItems: number; status: string; user: { name: string | null } }> = [];

    const toNumber = (value: unknown) => {
        if (typeof value === "number") return value;
        if (typeof value === "bigint") return Number(value);
        if (typeof value === "string") {
            const n = Number(value);
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    };

    try {
        const [paidCountRow, pendingCountRow] = await prisma.$queryRaw<
            Array<{ paidCount: unknown; pendingCount: unknown }>
        >`
          WITH pay AS (
            SELECT "invoiceId" as invoiceId, SUM("amount") as sumPaid
            FROM "Payment"
            GROUP BY "invoiceId"
          ),
          saleAgg AS (
            SELECT
              "invoiceId" as invoiceId,
              SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "netAmount" ELSE 0 END) as sumSalePaid
            FROM "Sale"
            WHERE "invoiceId" IS NOT NULL
            GROUP BY "invoiceId"
          ),
          inv AS (
            SELECT
              i."id" as id,
              i."totalAmount" as totalAmount,
              MAX(COALESCE(i."paidAmount", 0), COALESCE(pay.sumPaid, 0), COALESCE(saleAgg.sumSalePaid, 0)) as paidAmount
            FROM "Invoice" i
            LEFT JOIN pay ON pay.invoiceId = i."id"
            LEFT JOIN saleAgg ON saleAgg.invoiceId = i."id"
            WHERE i."isActive" = 1
            GROUP BY i."id"
          )
          SELECT
            CAST(SUM(CASE WHEN (inv.totalAmount - inv.paidAmount) <= 0.009 THEN 1 ELSE 0 END) AS INTEGER) as paidCount,
            CAST(SUM(CASE WHEN (inv.totalAmount - inv.paidAmount) > 0.009 THEN 1 ELSE 0 END) AS INTEGER) as pendingCount
          FROM inv
        `;

        paidInvoices = toNumber(paidCountRow?.paidCount);
        pendingInvoices = toNumber(pendingCountRow?.pendingCount);

        [salesTodayCount, salesMonthCount, avgSale, activeListings, listingBreakdown] = await Promise.all([
            prisma.sale.count({ where: { saleDate: { gte: todayUtc } } }),
            prisma.sale.count({ where: { saleDate: { gte: rangeStartUtc } } }),
            prisma.sale.aggregate({ _avg: { netAmount: true }, where: { saleDate: { gte: rangeStartUtc } } }),
            prisma.listing.count({ where: { status: { in: ["ACTIVE", "LISTED"] } } }),
            prisma.listing.groupBy({ by: ["platform"], where: { status: { in: ["ACTIVE", "LISTED"] } }, _count: { id: true } }),
        ]);

        const [recentSalesRes, slowMovingRes, pendingPaymentsRowsRaw, recentLabelJobsRes] = await Promise.all([
            prisma.sale.findMany({
                orderBy: { saleDate: "desc" },
                take: 5,
                select: {
                    id: true,
                    netAmount: true,
                    customerName: true,
                    inventory: { select: { sku: true } },
                    invoice: { select: { invoiceNumber: true } }
                }
            }),
            prisma.analyticsInventorySnapshot.findMany({
                where: { status: "IN_STOCK" },
                orderBy: { daysInStock: "desc" },
                take: 5
            }),
            prisma.$queryRaw<Array<{ invoiceNumber: string; customerName: string | null; pendingAmount: unknown }>>`
              WITH pay AS (
                SELECT "invoiceId" as invoiceId, SUM("amount") as sumPaid
                FROM "Payment"
                GROUP BY "invoiceId"
              ),
              saleAgg AS (
                SELECT
                  "invoiceId" as invoiceId,
                  SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "netAmount" ELSE 0 END) as sumSalePaid
                FROM "Sale"
                WHERE "invoiceId" IS NOT NULL
                GROUP BY "invoiceId"
              ),
              inv AS (
                SELECT
                  i."id" as id,
                  i."invoiceNumber" as invoiceNumber,
                  i."totalAmount" as totalAmount,
                  MAX(COALESCE(i."paidAmount", 0), COALESCE(pay.sumPaid, 0), COALESCE(saleAgg.sumSalePaid, 0)) as paidAmount
                FROM "Invoice" i
                LEFT JOIN pay ON pay.invoiceId = i."id"
                LEFT JOIN saleAgg ON saleAgg.invoiceId = i."id"
                WHERE i."isActive" = 1
                GROUP BY i."id"
              )
              SELECT
                inv.invoiceNumber as invoiceNumber,
                MIN(s."customerName") as customerName,
                CAST(inv.totalAmount - inv.paidAmount AS REAL) as pendingAmount
              FROM inv
              LEFT JOIN "Sale" s ON s."invoiceId" = inv.id
              WHERE (inv.totalAmount - inv.paidAmount) > 0.009
              GROUP BY inv.id
              ORDER BY pendingAmount DESC
              LIMIT 5
            `,
            prisma.labelPrintJob.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    totalItems: true,
                    status: true,
                    user: { select: { name: true } }
                }
            }),
        ]);
        recentSales = recentSalesRes;
        slowMoving = slowMovingRes;
        recentLabelJobs = recentLabelJobsRes;
        pendingPaymentsRows = pendingPaymentsRowsRaw.map((row) => ({
            ...row,
            pendingAmount: toNumber(row.pendingAmount),
        }));

        try {
            const mismatches = await prisma.$queryRaw<Array<{ invoiceNumber: string; totalAmount: unknown; paidAmount: unknown; paymentStatus: string }>>`
              WITH pay AS (
                SELECT "invoiceId" as invoiceId, SUM("amount") as sumPaid
                FROM "Payment"
                GROUP BY "invoiceId"
              ),
              saleAgg AS (
                SELECT
                  "invoiceId" as invoiceId,
                  SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "netAmount" ELSE 0 END) as sumSalePaid
                FROM "Sale"
                WHERE "invoiceId" IS NOT NULL
                GROUP BY "invoiceId"
              ),
              inv AS (
                SELECT
                  i."id" as id,
                  i."invoiceNumber" as invoiceNumber,
                  i."paymentStatus" as paymentStatus,
                  i."totalAmount" as totalAmount,
                  MAX(COALESCE(i."paidAmount", 0), COALESCE(pay.sumPaid, 0), COALESCE(saleAgg.sumSalePaid, 0)) as computedPaid
                FROM "Invoice" i
                LEFT JOIN pay ON pay.invoiceId = i."id"
                LEFT JOIN saleAgg ON saleAgg.invoiceId = i."id"
                WHERE i."isActive" = 1
                GROUP BY i."id"
              )
              SELECT invoiceNumber, totalAmount, computedPaid as paidAmount, paymentStatus
              FROM inv
              WHERE (paymentStatus = 'PAID' AND (totalAmount - computedPaid) > 0.009)
                 OR (paymentStatus <> 'PAID' AND (totalAmount - computedPaid) <= 0.009 AND totalAmount > 0.009)
              LIMIT 5
            `;

            if (mismatches.length > 0) {
                console.warn("[Reports] Payment status mismatches detected (sample):", mismatches);
            }
        } catch {}
    } catch (error) {
        if (isMissingTableError(error)) {
            return renderSetup();
        }
        throw error;
    }

    const profitStats = await (async () => {
        try {
            const [avgRow] = await prisma.$queryRaw<Array<{ avgProfit: number | null }>>`
              SELECT CAST(AVG(COALESCE("profit", "netAmount" - COALESCE("costPriceSnapshot", 0))) AS REAL) as avgProfit
              FROM "Sale"
              WHERE "saleDate" >= ${rangeStartUtc}
            `;

            const [highRow] = await prisma.$queryRaw<Array<{ category: string | null; avgProfit: number | null }>>`
              SELECT i."category" as category,
                     CAST(AVG(COALESCE(s."profit", s."netAmount" - COALESCE(s."costPriceSnapshot", 0))) AS REAL) as avgProfit
              FROM "Sale" s
              JOIN "Inventory" i ON i."id" = s."inventoryId"
              WHERE s."saleDate" >= ${rangeStartUtc}
              GROUP BY i."category"
              ORDER BY avgProfit DESC
              LIMIT 1
            `;

            const [lowRow] = await prisma.$queryRaw<Array<{ category: string | null; avgProfit: number | null }>>`
              SELECT i."category" as category,
                     CAST(AVG(COALESCE(s."profit", s."netAmount" - COALESCE(s."costPriceSnapshot", 0))) AS REAL) as avgProfit
              FROM "Sale" s
              JOIN "Inventory" i ON i."id" = s."inventoryId"
              WHERE s."saleDate" >= ${rangeStartUtc}
              GROUP BY i."category"
              ORDER BY avgProfit ASC
              LIMIT 1
            `;

            return {
                avgProfit: Number(avgRow?.avgProfit ?? 0),
                highestCategory: highRow?.category || null,
                lowestCategory: lowRow?.category || null,
            };
        } catch {
            return { avgProfit: 0, highestCategory: null, lowestCategory: null };
        }
    })();
    if (!slowMoving || slowMoving.length === 0) {
        const oldest = await prisma.inventory.findMany({
            where: { status: "IN_STOCK" },
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, sku: true, itemName: true, createdAt: true }
        });
        slowMoving = oldest.map((i: { id: string; sku: string; itemName: string; createdAt: Date }) => ({
            id: i.id,
            sku: i.sku,
            itemName: i.itemName,
            daysInStock: Math.max(0, Math.floor((Date.now() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
        }));
    }

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
        { title: "GST Reports", description: "GSTR-1 exports, HSN summary, credit notes", icon: FileText, href: "/reports/gst", allowed: canViewFinancials },
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
                    <ReportsRangeSelect defaultDays={rangeDays} />
                    <Input placeholder="Category" />
                    <Input placeholder="Vendor" />
                    <Input placeholder="Platform" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Inventory Health</CardTitle><Boxes className="h-4 w-4 text-blue-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Items in Stock: <span className="font-semibold">{(latestSnapshot?.inventoryCount ?? 0) || liveInventory.count}</span></div><div>Inventory Value: <span className="font-semibold">{formatCurrency((latestSnapshot?.inventoryValueSell ?? 0) || liveInventory.sellValue)}</span></div><div>Slow Moving: <span className="font-semibold">{slowMoving.length}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Sales Performance</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Sales Today: <span className="font-semibold">{salesTodayCount}</span></div><div>Sales Last {rangeDays} Days: <span className="font-semibold">{salesMonthCount}</span></div><div>Avg Sale Price: <span className="font-semibold">{formatCurrency(avgSale._avg.netAmount || 0)}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Payments Status</CardTitle><CircleDollarSign className="h-4 w-4 text-yellow-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Paid Invoices: <span className="font-semibold">{paidInvoices}</span></div><div>Pending Payments: <span className="font-semibold">{pendingInvoices}</span></div><div>Collection Rate: <span className="font-semibold">{collectionRate.toFixed(1)}%</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Profit Insights</CardTitle><Percent className="h-4 w-4 text-amber-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Avg Margin: <span className="font-semibold">{formatCurrency(profitStats.avgProfit)}</span></div><div>Highest Category: <span className="font-semibold">{profitStats.highestCategory || "-"}</span></div><div>Lowest Category: <span className="font-semibold">{profitStats.lowestCategory || "-"}</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Listings Overview</CardTitle><Activity className="h-4 w-4 text-purple-600" /></div></CardHeader><CardContent className="space-y-1 text-sm"><div>Active Listings: <span className="font-semibold">{activeListings}</span></div>{listingBreakdown.slice(0, 3).map((row) => (<div key={row.platform}>{row.platform}: <span className="font-semibold">{row._count.id}</span></div>))}</CardContent></Card>
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
                <Card><CardHeader><CardTitle>Pending Payments</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{pendingPaymentsRows.map((row) => (<TableRow key={row.invoiceNumber}><TableCell>{row.invoiceNumber}</TableCell><TableCell>{row.customerName || "-"}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.pendingAmount))}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
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
