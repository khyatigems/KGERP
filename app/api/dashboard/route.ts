import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Determine Database Connection Source (Keep existing logic)
    let dbConnection = 'Local SQLite';
    try {
        const sourceSetting = await prisma.setting.findUnique({
            where: { key: 'DATABASE_SOURCE' },
            select: { value: true }
        });

        if (sourceSetting?.value === 'TURSO_CLOUD_DB') {
            dbConnection = 'Turso Cloud';
        } else if (process.env.DATABASE_URL?.startsWith('libsql') || process.env.DATABASE_URL?.startsWith('https')) {
            dbConnection = 'Turso Cloud';
        }
    } catch (e) {
        console.warn("Failed to determine DB source:", e);
    }

    // 1. KPI Counts
    console.log("Dashboard API: Starting KPI fetch...");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfNextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
        totalInventory,
        activeListingsRaw,
        activeQuotations,
        invoicesGenerated,
        labelCartCount,
        lastLabelCartItem,
        recentSales,
        // Attention Required
        expiringQuotations,
        overdueInvoices,
        overdueMemoItems,
        pendingVendors,
        unsoldInventory,
        missingCertifications,
        missingImages,
        pendingExpenses,
        highValueUnsold,
        // Today's Actions
        todayInventory,
        todayQuotations,
        todayLabels,
        todayInvoices,
        // Analytics
        allSalesRaw
    ] = await Promise.all([
        // Existing KPIs
        prisma.inventory.count({ where: { status: "IN_STOCK" } }).catch(e => { console.error("KPI Fail: Inventory", e); return 0; }),
        prisma.listing.groupBy({
            by: ['platform'],
            where: { status: { in: ["LISTED", "ACTIVE"] } },
            _count: { id: true }
        }).catch(e => { console.error("KPI Fail: Listings", e); return []; }),
        prisma.quotation.count({ 
            where: { 
                status: { in: ["SENT", "PENDING_APPROVAL", "APPROVED", "ACCEPTED", "ACTIVE"] } 
            } 
        }).catch(e => { console.error("KPI Fail: Quotations", e); return 0; }),
        prisma.invoice.count().catch(e => { console.error("KPI Fail: Invoices", e); return 0; }),
        prisma.labelCartItem.count({
            where: { 
                userId: userId ?? "00000000-0000-0000-0000-000000000000",
                inventory: { id: { not: "" } }
            }
        }).catch(e => { console.error("KPI Fail: LabelCart", e); return 0; }),
        prisma.labelCartItem.findFirst({
            where: { 
                userId: userId ?? "00000000-0000-0000-0000-000000000000",
                inventory: { id: { not: "" } }
            },
            orderBy: { addedAt: 'desc' },
            include: { inventory: { select: { sku: true, itemName: true } } }
        }).catch(e => { console.error("KPI Fail: LastLabel", e); return null; }),
        prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            select: {
                id: true,
                customerName: true,
                netAmount: true,
                saleDate: true,
                paymentStatus: true
            }
        }).catch(e => { console.error("KPI Fail: RecentSales", e); return []; }),

        // Attention Required Queries
        prisma.quotation.findMany({
            where: { status: "PENDING_APPROVAL", validUntil: { lt: endOfNextWeek } },
            select: { id: true, quotationNumber: true, customerName: true, expiryDate: true },
            take: 5
        }).catch(() => []),

        prisma.invoice.findMany({
            where: { status: "ISSUED", paymentStatus: "UNPAID", dueDate: { lt: now } },
            select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true },
            take: 5
        }).catch(() => []),

        prisma.memo.findMany({
            where: { status: "OPEN", expiryDate: { lt: now } },
            select: { 
                id: true, 
                customerName: true, 
                issueDate: true,
                items: {
                    take: 1,
                    include: { inventory: { select: { sku: true } } }
                }
            },
            take: 5
        }).catch(() => []),

        prisma.vendor.count({ where: { status: "PENDING_APPROVAL" } }).catch(() => 0), // Count is fine for simple badge

        prisma.inventory.findMany({
            where: { status: "IN_STOCK", updatedAt: { lt: sixtyDaysAgo } },
            select: { id: true, sku: true, createdAt: true },
            take: 5
        }).catch(() => []),

        prisma.inventory.findMany({
            where: { status: "IN_STOCK", certification: null },
            select: { id: true, sku: true, itemName: true },
            take: 5
        }).catch(() => []),

        prisma.inventory.findMany({
            where: { status: "IN_STOCK", imageUrl: null },
            select: { id: true, sku: true, itemName: true },
            take: 5
        }).catch(() => []),

        prisma.expense.findMany({
            where: { paymentStatus: "PENDING" },
            select: { id: true, description: true, totalAmount: true, expenseDate: true },
            take: 5
        }).catch(() => []),

        prisma.inventory.findMany({
            where: { status: "IN_STOCK", sellingPrice: { gt: 100000 }, updatedAt: { lt: ninetyDaysAgo } },
            select: { id: true, sku: true, sellingPrice: true },
            take: 5
        }).catch(() => []),

        // Today's Actions
        prisma.inventory.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.quotation.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.labelPrintJob.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),

        // Analytics Data (Sales with Inventory Details)
        prisma.sale.findMany({
            take: 1000,
            orderBy: { saleDate: 'desc' },
            select: {
                netAmount: true,
                inventory: {
                    select: {
                        category: true,
                        gemType: true,
                        stoneType: true
                    }
                }
            }
        }).catch(e => { console.error("KPI Fail: Analytics", e); return []; })
    ]);

    // Process Analytics
    const categoryStats: Record<string, { count: number; value: number }> = {};
    const typeStats: Record<string, { count: number; value: number }> = {};

    interface SalesWithInventory {
        netAmount: number;
        inventory: {
            category: string;
            gemType: string | null;
            stoneType: string | null;
        };
    }

    (allSalesRaw as SalesWithInventory[]).forEach((sale) => {
        const cat = sale.inventory?.category || 'Uncategorized';
        // Prefer gemType, fallback to stoneType, then Unknown
        const type = sale.inventory?.gemType || sale.inventory?.stoneType || 'Unknown';
        const value = Number(sale.netAmount) || 0;

        if (!categoryStats[cat]) categoryStats[cat] = { count: 0, value: 0 };
        categoryStats[cat].count++;
        categoryStats[cat].value += value;

        if (!typeStats[type]) typeStats[type] = { count: 0, value: 0 };
        typeStats[type].count++;
        typeStats[type].value += value;
    });

    const bestSellingCategories = Object.entries(categoryStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const bestSellingTypes = Object.entries(typeStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    console.log("Dashboard API: KPI fetch complete.");

    // Process Listings Breakdown
    const platformMapping: Record<string, string> = {
        'WEBSITE': 'Website',
        'AMAZON': 'Amazon',
        'EBAY': 'eBay',
        'ETSY': 'Etsy',
        'WHATSAPP': 'WhatsApp'
    };

    const activeListings = activeListingsRaw.reduce((acc: Record<string, number>, curr: { platform: string; _count: { id: number } }) => {
        // Normalize platform key
        const key = platformMapping[curr.platform.toUpperCase()] || curr.platform;
        acc[key] = (acc[key] || 0) + curr._count.id;
        acc.total = (acc.total || 0) + curr._count.id;
        return acc;
    }, { total: 0 } as Record<string, number>);

    // Pending Payments (Complex calculation: Sales not PAID)
    // We assume an invoice is "Pending" if linked sales are not PAID.
    // Optimization: Count sales with paymentStatus != 'PAID'
    const pendingPaymentsCount = await prisma.sale.count({
        where: {
            paymentStatus: { not: "PAID" }
        }
    });

    // 2. Trends (Placeholder for now, requires KpiSnapshot data)
    // In a real implementation with KpiSnapshot, we would fetch:
    // const yesterday = await prisma.kpiSnapshot.findUnique({ where: { date: yesterdayDate } });
    // const lastWeek = ...
    // And calculate % diff.
    // For now, we return 0 trend.
    const trends = {
        inventory: 0,
        listings: 0,
        quotations: 0,
        invoices: 0,
        pendingPayments: 0,
        labels: 0
    };

    return NextResponse.json({
        kpis: {
            inventory: {
                total: totalInventory,
                trend: trends.inventory
            },
            listings: {
                ...activeListings,
                trend: trends.listings
            },
            quotations: {
                total: activeQuotations,
                trend: trends.quotations
            },
            invoices: {
                total: invoicesGenerated,
                trend: trends.invoices
            },
            pendingPayments: {
                count: pendingPaymentsCount,
                trend: trends.pendingPayments
            },
            printLabels: {
                count: labelCartCount,
                trend: trends.labels,
                lastItem: lastLabelCartItem ? `${lastLabelCartItem.inventory.sku} - ${lastLabelCartItem.inventory.itemName}` : null
            },
            attention: {
                quotations: expiringQuotations,
                invoices: overdueInvoices,
                memo: overdueMemoItems,
                vendors: pendingVendors,
                unsold: unsoldInventory,
                missingCertifications,
                missingImages,
                pendingExpenses,
                highValueUnsold
            },
            today: {
                inventory: todayInventory,
                quotations: todayQuotations,
                labels: todayLabels,
                invoices: todayInvoices
            }
        },
        recentSales,
        analytics: {
            bestSellingCategories,
            bestSellingTypes
        },
        dbConnection
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
