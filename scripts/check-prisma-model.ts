
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Prisma Client models...");
  // keys might not show everything if they are lazy loaded getters, but usually they show up or we can check property access
  
  // Check if activityLog is accessible
  // @ts-ignore
  const activityLogModel = prisma.activityLog;
  
  if (activityLogModel) {
      console.log("✅ prisma.activityLog is defined.");
      try {
          // @ts-ignore
          const count = await prisma.activityLog.count();
          console.log(`✅ Table exists and is accessible. Total logs: ${count}`);
          
          if (count > 0) {
              // @ts-ignore
              const logs = await prisma.activityLog.findMany({ take: 2 });
              console.log("Sample logs:", logs);
          }
      } catch (e) {
          console.error("❌ prisma.activityLog is defined but query failed. Table might be missing.");
          console.error(e);
      }
  } else {
      console.log("❌ prisma.activityLog is UNDEFINED.");
      console.log("This means the Prisma Client is stale. 'npx prisma generate' is required.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
