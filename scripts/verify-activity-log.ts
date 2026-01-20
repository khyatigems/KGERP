
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function verifyActivityLog() {
  try {
    console.log("Verifying ActivityLog Model Access...");
    
    // Check if the model exists in the client instance
    const activityClient = prisma.activityLog;
    
    if (!activityClient) {
        console.error("ERROR: prisma.activityLog is undefined!");
        console.log("Available models:", Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
    } else {
        console.log("prisma.activityLog is accessible.");
        
        const count = await activityClient.count();
        console.log(`Current Activity Log Count: ${count}`);
        
        const logs = await activityClient.findMany({
            take: 1,
            orderBy: { timestamp: 'desc' }
        });
        
        if (logs.length > 0) {
            console.log("Latest log:", logs[0]);
        } else {
            console.log("No logs found.");
        }
    }

  } catch (e) {
    console.error("Verification Failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyActivityLog();
