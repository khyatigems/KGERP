
import { prisma } from "../lib/prisma";
import { logActivity } from "../lib/activity-logger";

async function main() {
  console.log("Creating a test activity log...");
  
  try {
      await logActivity({
          entityType: "System",
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
      // @ts-ignore
      const count = await prisma.activityLog.count();
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
