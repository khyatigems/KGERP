import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getInventoryAgingAnalytics, getCapitalRotationAnalytics } from "@/lib/reports-analytics";
import { getCustomerIntelligence } from "@/lib/customer-intelligence";

type CheckResult = {
  report: string;
  ok: boolean;
  details?: string;
};

async function runCheck(report: string, fn: () => Promise<unknown>): Promise<CheckResult> {
  try {
    await fn();
    return { report, ok: true };
  } catch (error) {
    return {
      report,
      ok: false,
      details: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checks = await Promise.all([
    runCheck("reports-hub", async () => {
      await Promise.all([
        prisma.inventory.count(),
        prisma.sale.count(),
        prisma.invoice.count()
      ]);
    }),
    runCheck("inventory", async () => {
      await prisma.inventory.count();
    }),
    runCheck("sales", async () => {
      await prisma.sale.aggregate({ _sum: { netAmount: true } });
    }),
    runCheck("profit", async () => {
      await prisma.sale.aggregate({ _avg: { profit: true } });
    }),
    runCheck("quotations", async () => {
      await prisma.quotation.count();
    }),
    runCheck("invoices", async () => {
      await prisma.invoice.count();
    }),
    runCheck("inventory-aging", async () => {
      await getInventoryAgingAnalytics({ status: "IN_STOCK", page: 1, pageSize: 10 });
    }),
    runCheck("capital-rotation", async () => {
      await getCapitalRotationAnalytics();
    }),
    runCheck("certificate-readiness", async () => {
      await prisma.inventory.count({
        where: {
          OR: [
            { certification: null },
            { certification: "" }
          ]
        }
      });
    }),
    runCheck("payments", async () => {
      await prisma.payment.aggregate({ _sum: { amount: true } });
    }),
    runCheck("expenses", async () => {
      await prisma.expense.count();
    }),
    runCheck("ops", async () => {
      await Promise.all([
        prisma.labelPrintJob.count(),
        prisma.activityLog.count()
      ]);
    }),
    runCheck("qr-scans", async () => {
      await prisma.gpisVerificationLog.count();
    }),
    runCheck("customer-intelligence", async () => {
      await getCustomerIntelligence(30);
    })
  ]);

  const failed = checks.filter((c) => !c.ok).length;
  return NextResponse.json({
    ok: failed === 0,
    total: checks.length,
    failed,
    checks
  });
}
