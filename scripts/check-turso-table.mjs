
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

async function main() {
    console.log("Checking Turso DB...");
    console.log("DB URL:", process.env.DATABASE_URL);

    const connectionString = process.env.DATABASE_URL;
    const client = createClient({ url: connectionString });
    const adapter = new PrismaLibSQL(client);
    const prisma = new PrismaClient({ adapter });

    try {
        const count = await prisma.labelCartItem.count();
        console.log("✅ [Turso] LabelCartItem exists. Count:", count);
    } catch (e) {
        if (e.message.includes('no such table')) {
            console.error("❌ [Turso] Table LabelCartItem NOT found.");
            console.log("Run 'npx prisma db push' to create it.");
        } else {
            console.error("❌ [Turso] Error:", e.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
