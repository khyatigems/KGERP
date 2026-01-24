import { prisma } from "@/lib/prisma";
import { OpsAnalytics } from "@/components/reports/ops-analytics";
import { startOfDay, subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function OpsReportPage() {
  const today = new Date();
  const sevenDaysAgo = startOfDay(subDays(today, 6));

  // 1. Fetch Print Jobs
  const printJobs = await prisma.labelPrintJob.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const totalPrintJobs = await prisma.labelPrintJob.count();
  const totalItemsPrintedAgg = await prisma.labelPrintJob.aggregate({
    _sum: {
      totalItems: true,
    },
  });
  const totalItemsPrinted = totalItemsPrintedAgg._sum.totalItems || 0;

  // 2. Aggregate Daily Activity (Last 7 Days)
  const dailyActivityMap = new Map<string, number>();
  
  // Initialize
  for (let i = 0; i < 7; i++) {
    const dayDate = subDays(today, 6 - i);
    const dayKey = format(dayDate, "MMM dd");
    dailyActivityMap.set(dayKey, 0);
  }

  printJobs.forEach((job) => {
    const dayKey = format(job.createdAt, "MMM dd");
    if (dailyActivityMap.has(dayKey)) {
      dailyActivityMap.set(dayKey, (dailyActivityMap.get(dayKey) || 0) + job.totalItems);
    }
  });

  const dailyPrintActivity = Array.from(dailyActivityMap.entries()).map(([date, items]) => ({
    date,
    items,
  }));

  // 3. Fetch Recent Activity Logs
  const recentLogs = await prisma.activityLog.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      actionType: true,
      entityType: true,
      userName: true,
      createdAt: true,
    },
  });

  const recentActivities = recentLogs.map(log => ({
    id: log.id,
    action: log.actionType,
    entityType: log.entityType,
    userName: log.userName || "Unknown",
    timestamp: log.createdAt.toISOString(),
  }));

  const analyticsData = {
    totalPrintJobs,
    totalItemsPrinted,
    dailyPrintActivity,
    recentActivities,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Label & Ops Reports</h1>
      <OpsAnalytics data={analyticsData} />
    </div>
  );
}
