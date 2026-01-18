
import { prisma } from "../lib/prisma";
import { logActivity } from "../lib/activity-logger";

async function main() {
  console.log("Creating a test activity log...");
  
  try {
      await logActivity({
          entityType: "User",
          entityId: "test-id-123",
          entityIdentifier: "Test Check",
          actionType: "STATUS_CHANGE",
          source: "SYSTEM",
          userName: "Trae Assistant",
          userId: "system-test",
          oldData: { status: "OFFLINE" },
          newData: { status: "ONLINE" }
      });
      
      console.log("✅ Test log created successfully.");
      
      // Verify it exists
      const count = await (prisma as typeof prisma & { activityLog: { count: () => Promise<number> } }).activityLog.count();
      console.log(`Current log count: ${count}`);
      
  } catch (error) {
      console.error("❌ Failed to create test log:", error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
