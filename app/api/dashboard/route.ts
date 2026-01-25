import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const revalidate = 60; // 60s cache

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
    const [
        totalInventory,
        activeListingsRaw,
        activeQuotations,
        invoicesGenerated,
        labelCartCount,
        lastLabelCartItem,
        recentSales
    ] = await Promise.all([
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
                inventory: { isNot: null }
            }
        }).catch(e => { console.error("KPI Fail: LabelCart", e); return 0; }),
        prisma.labelCartItem.findFirst({
            where: { userId: userId ?? "00000000-0000-0000-0000-000000000000" },
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
        }).catch(e => { console.error("KPI Fail: Sales", e); return []; })
    ]);
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
            }
        },
        recentSales,
        dbConnection
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
