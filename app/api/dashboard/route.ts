import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // 60s cache

export async function GET() {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Last 6 months range
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [
      activeQuotations,
      salesThisMonthAgg,
      recentSales,
      salesTrendRaw
    ] = await Promise.all([
      prisma.quotation.count({ where: { status: "ACTIVE" } }),
      prisma.sale.aggregate({
          _sum: { netAmount: true },
          where: {
              saleDate: {
                  gte: startOfMonth
              }
          }
      }),
      prisma.sale.findMany({
          take: 5,
          orderBy: { saleDate: "desc" },
          include: { inventory: { select: { itemName: true } } }
      }),
      prisma.sale.groupBy({
          by: ['saleDate'],
          _sum: {
              netAmount: true
          },
          where: {
              saleDate: {
                  gte: sixMonthsAgo
              }
          },
          orderBy: {
              saleDate: 'asc'
          }
      })
    ]);

    // Aggregate daily sales into monthly for the chart
    const monthlySalesMap = new Map<string, number>();
    salesTrendRaw.forEach(item => {
        const date = new Date(item.saleDate);
        const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        const current = monthlySalesMap.get(key) || 0;
        monthlySalesMap.set(key, current + (item._sum.netAmount || 0));
    });

    // Fill in missing months? Or just return what we have. 
    // For simplicity, just return array.
    const salesTrend = Array.from(monthlySalesMap.entries()).map(([name, total]) => ({
        name,
        total
    }));

    // Calculate Inventory Value
    const allInventory = await prisma.inventory.findMany({
        where: { status: "IN_STOCK" },
        select: {
            pricingMode: true,
            weightValue: true,
            purchaseRatePerCarat: true,
            sellingRatePerCarat: true,
            flatPurchaseCost: true,
            flatSellingPrice: true,
        }
    });

    let totalCost = 0;
    let totalSelling = 0;
    let totalProfitPotential = 0;

    for (const item of allInventory) {
        let cost = 0;
        let selling = 0;
        
        if (item.pricingMode === "PER_CARAT") {
            cost = (item.weightValue || 0) * (item.purchaseRatePerCarat || 0);
            selling = (item.weightValue || 0) * (item.sellingRatePerCarat || 0);
        } else {
            cost = (item.flatPurchaseCost || 0);
            selling = (item.flatSellingPrice || 0);
        }
        
        totalCost += cost;
        totalSelling += selling;
    }
    
    totalProfitPotential = totalSelling - totalCost;

    return NextResponse.json({
      inventoryValueCost: totalCost,
      inventoryValueSelling: totalSelling,
      totalProfitPotential,
      activeQuotations,
      salesThisMonth: salesThisMonthAgg._sum.netAmount || 0,
      salesTrend,
      recentSales
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
