import { prisma } from "@/lib/prisma";
import { runDailyAnalyticsSnapshots } from "@/lib/analytics/snapshot-runner";

runDailyAnalyticsSnapshots()
  .then(() => {
    console.log("Daily analytics snapshots generated successfully");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
