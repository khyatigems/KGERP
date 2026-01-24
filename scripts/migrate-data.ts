
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { prisma } from '../lib/prisma';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
console.log(`Reading from SQLite: ${dbPath}`);

const localDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

function getAll(table: string): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
        localDb.all(`SELECT * FROM "${table}"`, (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) {
                    console.warn(`Table ${table} not found in local DB, skipping.`);
                    resolve([]);
                } else {
                    reject(err);
                }
            }
            else resolve(rows as Record<string, unknown>[]);
        });
    });
}


async function cleanDatabase() {
    console.log("Cleaning target database...");
    const tableNames = [
        'ActivityLog', 'PublicLinkEvent', 
        'LandingPageSlide', 'LandingPageVersion', 'LandingPageSettings',
        'LabelPrintJobItem', 'LabelPrintJob', 'LabelCartItem',
        'QuotationItem', 'Quotation',
        'Invoice', 'Sale',
        'ListingPriceHistory', 'Listing',
        'Media', 
        '_InventoryToRashiCode', // Pivot
        'Inventory',
        'PurchaseItem', 'Purchase',
        'Vendor',
        'Setting',
        'User',
        'CategoryCode', 'GemstoneCode', 'ColorCode', 'CollectionCode', 'CutCode', 'RashiCode'
    ];

    for (const table of tableNames) {
        try {
            if (table.startsWith('_')) {
                 await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
            } else {
                 // Actually my helper uses camelCase.
                 // Let's just use deleteMany on the model if we can map it.
                 // Or easier: use raw SQL to delete.
                 await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
            }
            console.log(`  Deleted all from ${table}`);
        } catch (e) {
            console.warn(`  Failed to delete ${table}:`, (e instanceof Error ? e.message : String(e)));
        }
    }
}

async function migrateTable(tableName: string, modelName: string, dateFields: string[] = [], booleanFields: string[] = []) {
    console.log(`Migrating ${tableName}...`);
    const rows = await getAll(tableName);
    if (rows.length === 0) {
        console.log(`  No rows to migrate for ${tableName}.`);
        return;
    }

    // Transform dates and booleans
    const data = rows.map(row => {
        const newRow = { ...row };
        dateFields.forEach(field => {
            if (newRow[field]) {
                newRow[field] = new Date(newRow[field] as string | number);
            }
        });
        booleanFields.forEach(field => {
            if (newRow[field] !== undefined && newRow[field] !== null) {
                newRow[field] = Boolean(newRow[field]);
            }
        });
        return newRow;
    });

    // Batch insert
    const batchSize = 50;
    let count = 0;
    
    // Clear existing data is now done globally, but we can keep it safely or remove it.
    // I'll remove the per-table delete to avoid redundancy and FK issues if order is wrong here.
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        try {
            // @ts-expect-error - Dynamic model access
            // SQLite provider does not support skipDuplicates in createMany
            await prisma[modelName].createMany({
                data: batch,
            });
            count += batch.length;
        } catch (e) {
            console.error(`  Error inserting batch for ${modelName}:`, e);
        }
    }
    console.log(`  Migrated ${count} / ${rows.length} rows for ${tableName}.`);
}

async function migrateImplicitManyToMany(table: string) {
    console.log(`Migrating Pivot Table ${table}...`);
    const rows = await getAll(table);
    if (rows.length === 0) return;

    let count = 0;
    for (const row of rows) {
        const valA = row["A"]; // Prisma default column names
        const valB = row["B"];
        
        // We have to use raw SQL for implicit tables usually, or connect them via update
        // But since we can't easily access the implicit table model, we use executeRaw
        try {
            await prisma.$executeRawUnsafe(
                `INSERT OR IGNORE INTO "${table}" ("A", "B") VALUES (?, ?)`,
                valA, valB
            );
            count++;
        } catch {
            // console.error(`Failed to insert pivot ${valA}-${valB}`, e);
        }
    }
    console.log(`  Migrated ${count} pivot rows.`);
}

async function main() {
    try {
        await cleanDatabase();

        // 1. Codes
        await migrateTable('CategoryCode', 'categoryCode', ['createdAt', 'updatedAt']);
        await migrateTable('GemstoneCode', 'gemstoneCode', ['createdAt', 'updatedAt']);
        await migrateTable('ColorCode', 'colorCode', ['createdAt', 'updatedAt']);
        await migrateTable('CollectionCode', 'collectionCode', ['createdAt', 'updatedAt']);
        await migrateTable('CutCode', 'cutCode', ['createdAt', 'updatedAt']);
        await migrateTable('RashiCode', 'rashiCode', ['createdAt', 'updatedAt']);

        // 2. User
        await migrateTable('User', 'user', ['lastLogin', 'lastPasswordChange', 'forceLogoutBefore', 'createdAt']);

        // 3. Setting
        await migrateTable('Setting', 'setting', ['updatedAt']);

        // 4. Vendor
        await migrateTable('Vendor', 'vendor', ['createdAt']);

        // 5. Purchase & Items
        await migrateTable('Purchase', 'purchase', ['purchaseDate', 'createdAt']);
        await migrateTable('PurchaseItem', 'purchaseItem', []);

        // 6. Inventory & Media
        await migrateTable('Inventory', 'inventory', ['createdAt']);
        await migrateTable('Media', 'media', ['createdAt']);

        // 7. Pivot: Inventory <-> RashiCode
        // Prisma default name is usually _InventoryToRashiCode
        await migrateImplicitManyToMany('_InventoryToRashiCode');

        // 8. Listings
        await migrateTable('Listing', 'listing', ['listedDate', 'createdAt', 'updatedAt']);
        await migrateTable('ListingPriceHistory', 'listingPriceHistory', ['changedAt']);

        // 9. Sales & Invoices
        await migrateTable('Sale', 'sale', ['saleDate', 'createdAt'], ['gstApplicable']);
        await migrateTable('Invoice', 'invoice', ['createdAt'], ['isActive']);

        // 10. Quotations
        await migrateTable('Quotation', 'quotation', ['expiryDate', 'createdAt']);
        await migrateTable('QuotationItem', 'quotationItem', []);

        // 11. Label Stuff
        await migrateTable('LabelCartItem', 'labelCartItem', ['addedAt']);
        await migrateTable('LabelPrintJob', 'labelPrintJob', ['timestamp']);
        await migrateTable('LabelPrintJobItem', 'labelPrintJobItem', []);

        // 12. Landing Page
        await migrateTable('LandingPageSettings', 'landingPageSettings', ['whatsNewUpdatedAt', 'updatedAt'], ['slideshowEnabled', 'highlightsEnabled', 'whatsNewEnabled']);
        await migrateTable('LandingPageSlide', 'landingPageSlide', [], ['isActive']);
        await migrateTable('LandingPageVersion', 'landingPageVersion', ['createdAt'], ['isRollback']);

        // 13. Public Link & Activity
        await migrateTable('PublicLinkEvent', 'publicLinkEvent', ['createdAt']);
        await migrateTable('ActivityLog', 'activityLog', ['timestamp']);

        console.log("Migration completed successfully.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        localDb.close();
        await prisma.$disconnect();
    }
}

main();
