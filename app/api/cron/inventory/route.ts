import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Ensure it's not cached statically

export async function GET() {
  console.log("Starting Inventory Metrics Cron Job...");
  const now = new Date();

  try {
    // Process in batches if necessary, but for now fetch all active inventory
    // We only care about IN_STOCK or MEMO items really, but let's process all not SOLD?
    // "Unsold > configurable days" implies we track unsold items.
    const inventoryItems = await prisma.inventory.findMany({
      where: {
        status: { not: "SOLD" }
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        memoItems: {
            where: { status: "WITH_CLIENT" },
            select: { memo: { select: { issueDate: true } } },
            take: 1
        }
      }
    });

    console.log(`Processing ${inventoryItems.length} inventory items...`);

    let updatedCount = 0;

    // Use a transaction or batching for better performance if list is huge
    // For V1/V3 start, sequential upsert is fine or Promise.all
    const updates = inventoryItems.map(async (item) => {
        const createdAt = new Date(item.createdAt);
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        let memoDays = 0;
        if (item.memoItems.length > 0) {
            const memoDate = new Date(item.memoItems[0].memo.issueDate);
            const memoDiff = Math.abs(now.getTime() - memoDate.getTime());
            memoDays = Math.ceil(memoDiff / (1000 * 60 * 60 * 24));
        }

        await prisma.inventoryMetrics.upsert({
            where: { inventoryId: item.id },
            update: {
                daysInStock,
                memoDays,
                lastUpdated: now
            },
            create: {
                inventoryId: item.id,
                daysInStock,
                memoDays
            }
        });
        updatedCount++;
    });

    await Promise.all(updates);

    console.log(`Inventory Metrics Cron Job Completed. Updated ${updatedCount} records.`);

    return NextResponse.json({
      success: true,
      processed: updatedCount
    });

  } catch (error) {
    console.error("Inventory Cron Error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory metrics" },
      { status: 500 }
    );
  }
}
