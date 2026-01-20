import { PrismaClient } from '@prisma/client';
import path from 'path';

async function checkDB(name, url) {
    console.log(`\nChecking ${name} at ${url}...`);
    const prisma = new PrismaClient({
        datasources: { db: { url } },
        log: ['error'],
    });

    try {
        const count = await prisma.labelCartItem.count();
        console.log(`✅ [${name}] LabelCartItem exists. Count: ${count}`);
    } catch (e) {
        if (e.message.includes('no such table')) {
            console.error(`❌ [${name}] Table LabelCartItem NOT found.`);
        } else {
            console.error(`❌ [${name}] Error:`, e.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const rootDB = 'file:' + path.join(process.cwd(), 'dev.db');
    const prismaDB = 'file:' + path.join(process.cwd(), 'prisma', 'dev.db');

    await checkDB('ROOT DB', rootDB);
    await checkDB('PRISMA DB', prismaDB);
}

main();
