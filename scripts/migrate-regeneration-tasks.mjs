import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXTRA_COLUMNS = [
  ['selectedItemIds', 'TEXT'],
  ['selectionMode', 'TEXT'],
];

async function migrate() {
  try {
    console.log('Creating regeneration_tasks table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS regeneration_tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'PENDING',
        total INTEGER NOT NULL DEFAULT 0,
        updated INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        pending INTEGER NOT NULL DEFAULT 0,
        errors TEXT NOT NULL DEFAULT '[]',
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        message TEXT,
        selectedItemIds TEXT,
        selectionMode TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Upgrade tables created before the "selected items" feature.
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("regeneration_tasks")`
    );
    const existing = new Set((columns || []).map((c) => c.name));
    for (const [name, type] of EXTRA_COLUMNS) {
      if (!existing.has(name)) {
        console.log(`Adding missing column: ${name}`);
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "regeneration_tasks" ADD COLUMN "${name}" ${type};`
        );
      }
    }

    console.log('regeneration_tasks table ready');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
