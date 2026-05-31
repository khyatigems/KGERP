import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('Checking regeneration_tasks table...\n');
    
    // Check if table exists
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='regeneration_tasks'`;
    console.log('✓ Table exists:', tables.length > 0 ? 'YES' : 'NO');
    
    // Check for any tasks
    const tasks = await prisma.$queryRaw`SELECT * FROM regeneration_tasks`;
    console.log(`✓ Tasks in database: ${tasks.length}`);
    
    if (tasks.length > 0) {
      console.log('\n📋 Recent tasks:');
      tasks.slice(-5).forEach(task => {
        console.log(`  - ID: ${task.id}, Status: ${task.status}, Updated: ${task.updated}`);
      });
    }
    
    // Test insert a sample task
    console.log('\n🧪 Testing insert...');
    const testId = 'test-' + Date.now();
    await prisma.$executeRaw`
      INSERT INTO regeneration_tasks 
      (id, status, total, updated, failed, pending, errors, startTime)
      VALUES (${testId}, 'PENDING', 0, 0, 0, 0, '[]', ${Date.now()})
    `;
    console.log(`✓ Inserted test task: ${testId}`);
    
    // Verify it was inserted
    const testTask = await prisma.$queryRaw`SELECT * FROM regeneration_tasks WHERE id = ${testId}`;
    if (testTask.length > 0) {
      console.log(`✓ Test task found in database: ${JSON.stringify(testTask[0])}`);
      // Clean up
      await prisma.$executeRaw`DELETE FROM regeneration_tasks WHERE id = ${testId}`;
      console.log('✓ Test task cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
