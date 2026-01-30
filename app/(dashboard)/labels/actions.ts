"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { encodePrice } from "@/lib/price-encoder";
import { LabelConfig } from "@/lib/label-generator";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

export async function addToCart(inventoryId: string): Promise<{ success: boolean; message?: string }> {
    const perm = await checkPermission(PERMISSIONS.INVENTORY_VIEW);
    if (!perm.success) return { success: false, message: perm.message };

    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Unauthorized" };

    try {
        const existing = await prisma.labelCartItem.findFirst({
            where: {
                userId: session.user.id,
                inventoryId: inventoryId
            }
        });

        if (existing) {
            return { success: true, message: "Already in cart" };
        }

        await prisma.labelCartItem.create({
            data: {
                userId: session.user.id,
                inventoryId: inventoryId
            }
        });
        
        revalidatePath("/labels");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: "Failed to add to cart" };
    }
}

export async function addManyToCart(inventoryIds: string[]): Promise<{ success: boolean; message?: string; count?: number }> {
    const perm = await checkPermission(PERMISSIONS.INVENTORY_VIEW);
    if (!perm.success) return { success: false, message: perm.message };

    const session = await auth();
    console.log("[addManyToCart] Session:", session ? { user: session.user } : "null");
    
    if (!session?.user?.id) {
        console.error("[addManyToCart] Unauthorized: No user ID in session");
        return { success: false, message: "Unauthorized: Please log in again." };
    }

    try {
        console.log(`[addManyToCart] Adding ${inventoryIds.length} items for user ${session.user.id}`);
        const existing = await prisma.labelCartItem.findMany({
            where: {
                userId: session.user.id,
                inventoryId: { in: inventoryIds }
            },
            select: { inventoryId: true }
        });
        
        const existingIds = new Set(existing.map(e => e.inventoryId));
        const toAdd = inventoryIds.filter(id => !existingIds.has(id));

        if (toAdd.length > 0) {
            await prisma.labelCartItem.createMany({
                data: toAdd.map(id => ({
                    userId: session.user.id!,
                    inventoryId: id
                }))
            });
        }

        revalidatePath("/labels");
        return { success: true, count: toAdd.length };
    } catch (e: unknown) {
        console.error("addManyToCart Error:", e);
        const msg = e instanceof Error ? e.message : "Failed to add items to cart";
        return { success: false, message: msg };
    }
}

export async function getCart() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const cartItems = await prisma.labelCartItem.findMany({
            where: { userId: session.user.id },
            include: {
                inventory: {
                    include: {
                        colorCode: true
                    }
                }
            },
            orderBy: { addedAt: 'desc' }
        });
        
        return cartItems;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function removeFromCart(cartItemId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.labelCartItem.delete({
            where: { id: cartItemId, userId: session.user.id }
        });
        revalidatePath("/labels");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function clearCart() {
    const session = await auth();
    if (!session?.user?.id) return { success: false };

    try {
        await prisma.labelCartItem.deleteMany({
            where: { userId: session.user.id }
        });
        revalidatePath("/labels");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function createLabelJob(data: {
    inventoryIds: string[], 
    printFormat: LabelConfig
}) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, items: [] };

    try {
        // Verify user exists to prevent orphan records
        const userExists = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!userExists) {
            return { success: false, items: [], message: "Session invalid: User not found. Please logout and login again." };
        }

        // 1. Fetch Items
        const items = await prisma.inventory.findMany({
            where: { id: { in: data.inventoryIds } },
            include: { colorCode: true }
        });

        // 2. Prepare Job Items with Server-Side Checksum Generation
        const jobItemsData = items.map(item => {
            // Determine price based on Pricing Mode
            let priceToEncode = 0;
            
            if (item.pricingMode === "PER_CARAT") {
                // Trust Rate * Weight for PER_CARAT items
                priceToEncode = (item.sellingRatePerCarat || 0) * (item.weightValue || 0);
            } else {
                // Default/Flat mode: Use Flat Price if available, otherwise fallback
                priceToEncode = item.flatSellingPrice || ((item.sellingRatePerCarat || 0) * (item.weightValue || 0));
            }
            // Encode using MOD-9
            const encoded = encodePrice(priceToEncode);

            return {
                inventoryId: item.id,
                sku: item.sku,
                sellingPrice: priceToEncode,
                priceWithChecksum: encoded.priceWithChecksum,
                checksumDigit: encoded.checksumDigit,
                // Additional data for frontend rendering
                itemName: item.itemName,
                gemType: item.gemType,
                color: item.colorCode?.name || "",
                weightValue: item.weightValue,
                weightUnit: item.weightUnit,
                weightRatti: item.weightRatti,
                shape: item.shape,
                dimensions: item.dimensionsMm,
                stockLocation: item.stockLocation,
                pricingMode: item.pricingMode === "PER_CARAT" ? "PER_CARAT" : "FLAT",
                sellingRatePerCarat: item.sellingRatePerCarat
            };
        });

        // 3. Create Job Record
        const job = await prisma.labelPrintJob.create({
            data: {
                userId: session.user.id,
                printFormat: JSON.stringify(data.printFormat),
                totalItems: items.length,
                items: {
                    create: jobItemsData.map(item => ({
                        sku: item.sku,
                        sellingPrice: item.sellingPrice,
                        priceWithChecksum: item.priceWithChecksum,
                        checksumDigit: item.checksumDigit,
                        checksumMethod: "MOD9",
                        encodingVersion: 1
                    }))
                }
            }
        });

        // 4. Remove items from Cart (if they exist there)
        await prisma.labelCartItem.deleteMany({
            where: {
                userId: session.user.id,
                inventoryId: { in: data.inventoryIds }
            }
        });

        revalidatePath("/labels");
        return { success: true, jobId: job.id, items: jobItemsData };
    } catch (e: unknown) {
        console.error("createLabelJob Error:", e);
        const msg = e instanceof Error ? e.message : "Unknown server error";
        return { success: false, items: [], message: msg };
    }
}

export async function getLabelJobs() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        // Verify user exists
        const userExists = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!userExists) return [];

        const jobs = await prisma.labelPrintJob.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                items: true 
            },
            take: 50
        });
        return jobs;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        // Self-healing for orphan records (where User was deleted but Job remains)
        if (msg.includes("Field user is required") || msg.includes("Inconsistent query result")) {
            console.warn("Detected orphan LabelPrintJobs. Initiating cleanup...");
            try {
                // 1. Get all jobs (raw, no relations)
                const allJobs = await prisma.labelPrintJob.findMany({
                    select: { id: true, userId: true }
                });
                
                // 2. Get all valid users
                const allUsers = await prisma.user.findMany({
                    select: { id: true }
                });
                const validUserIds = new Set(allUsers.map(u => u.id));

                // 3. Find orphans
                const orphanJobIds = allJobs
                    .filter(job => !validUserIds.has(job.userId))
                    .map(job => job.id);

                if (orphanJobIds.length > 0) {
                    console.log(`Deleting ${orphanJobIds.length} orphan jobs...`);
                    await prisma.labelPrintJob.deleteMany({
                        where: { id: { in: orphanJobIds } }
                    });
                    
                    // 4. Retry fetch
                    return await prisma.labelPrintJob.findMany({
                        orderBy: { createdAt: 'desc' },
                        include: {
                            user: {
                                select: { name: true, email: true }
                            },
                            items: true 
                        },
                        take: 50
                    });
                }
            } catch (cleanupError) {
                console.error("Failed to cleanup orphan jobs:", cleanupError);
            }
        }
        console.error("getLabelJobs Error:", error);
        return [];
    }
}

// Helper to reconstruct LabelItems from Job History
// Ensures "Bit-for-bit" identical reprint by using STORED prices
export async function getJobReprintItems(jobId: string) {
    try {
        const job = await prisma.labelPrintJob.findUnique({
            where: { id: jobId },
            include: { items: true }
        });

        if (!job) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skus = job.items.map((i: any) => i.sku);
        const inventoryItems = await prisma.inventory.findMany({
            where: { sku: { in: skus } },
            include: { colorCode: true }
        });

        // Map inventory items but use JOB price data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reprintItems = job.items.map((jobItem: any) => {
            const invItem = inventoryItems.find(i => i.sku === jobItem.sku);
            if (!invItem) return null; 
            
            return {
                id: invItem.id,
                sku: jobItem.sku,
                itemName: invItem.itemName,
                gemType: invItem.gemType || "",
                color: invItem.colorCode?.name || "",
                weightValue: invItem.weightValue || 0,
                weightUnit: invItem.weightUnit || "",
                weightRatti: invItem.weightRatti,
                shape: invItem.shape,
                dimensions: invItem.dimensionsMm,
                stockLocation: invItem.stockLocation,
                // FORCE USE OF STORED PRICE DATA
                sellingPrice: jobItem.sellingPrice,
                priceWithChecksum: jobItem.priceWithChecksum,
                pricingMode: "REPRINT" 
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).filter((i: any) => i !== null);

        return reprintItems;
    } catch (e) {
        console.error(e);
        return [];
    }
}
