
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Prisma Client models...");
  // keys might not show everything if they are lazy loaded getters, but usually they show up or we can check property access
  
  // Check if activityLog is accessible
  const activityLogModel = (prisma as typeof prisma & { activityLog?: unknown }).activityLog;
  
  if (activityLogModel) {
      console.log("✅ prisma.activityLog is defined.");
      try {
          const activityClient = (prisma as typeof prisma & {
            activityLog: { count: () => Promise<number>; findMany: (args: { take: number }) => Promise<unknown[]> };
          }).activityLog;
          const count = await activityClient.count();
          console.log(`✅ Table exists and is accessible. Total logs: ${count}`);
          
          if (count > 0) {
              const logs = await activityClient.findMany({ take: 2 });
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
