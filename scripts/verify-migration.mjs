import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('Verifying regeneration_tasks table...\n');
    
    const result = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='regeneration_tasks'
    `;
    
    if (result.length > 0) {
      console.log('✅ Table exists: regeneration_tasks');
      
      const schema = await prisma.$queryRaw`PRAGMA table_info(regeneration_tasks)`;
      console.log('\n📋 Table schema:');
      schema.forEach(col => {
        const notNull = col.notnull ? ' NOT NULL' : '';
        const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
        console.log(`  • ${col.name}: ${col.type}${notNull}${dflt}`);
      });
      
      console.log('\n✅ Migration successful! The table is ready to use.');
      process.exit(0);
    } else {
      console.log('❌ Table not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
