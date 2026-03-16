import { prisma } from "@/lib/prisma";
import { processQueuedExportJobs } from "@/lib/export-job-processor";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const created = await prisma.reportExportJob.createMany({
    data: [
      { reportType: "inventory", format: "CSV", status: "QUEUED", requestedBy: "integration-test" },
      { reportType: "capital-rotation", format: "CSV", status: "QUEUED", requestedBy: "integration-test" }
    ]
  });
  assert(created.count === 2, "Expected to create 2 queued export jobs");

  const result = await processQueuedExportJobs(10);
  assert(result.processed >= 2, "Expected queued export jobs to be processed");

  const jobs = await prisma.reportExportJob.findMany({
    where: { requestedBy: "integration-test" },
    orderBy: { createdAt: "desc" },
    take: 2
  });
  assert(jobs.length === 2, "Expected two integration test jobs");
  assert(jobs.every((j: { status: string }) => j.status === "COMPLETED"), "Expected export jobs to complete successfully");
}

run()
  .then(() => {
    console.log("export-job-queue.integration.ts passed");
  })
  .finally(async () => {
    await prisma.reportExportJob.deleteMany({ where: { requestedBy: "integration-test" } });
    await prisma.$disconnect();
  });
