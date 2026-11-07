import { ensureNotificationSchema } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

import { ensureReportExportJobSchema } from "@/lib/report-export-job-schema";

import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";



/** All source queries follow the permission used by their existing destination report. */

export async function getCompanionAttention(userId: string) {
  // Match the existing report's String.trim(), including imported tabs/Unicode spaces.
  const trimCharacters = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

  const [reports, listings] = await Promise.all([checkUserPermission(userId, PERMISSIONS.REPORTS_VIEW), checkUserPermission(userId, PERMISSIONS.LISTINGS_VIEW)]);

  const cards: Array<{ id: string; title: string; count: number; href: string; detail: string; priority: string; affected: string[]; updatedAt: string }> = [];

  const unavailable: string[] = [];

  const updatedAt = new Date().toISOString();

  if (reports) {

    try {

      const [photos, certificates] = await prisma.$transaction([

        prisma.inventory.count({ where: { status: "IN_STOCK", OR: [{ imageUrl: null }, { imageUrl: "" }], media: { none: { type: { in: ["IMAGE", "image"] } } } } }),

        prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) AS count FROM "Inventory" WHERE "status" = 'IN_STOCK' AND TRIM(COALESCE("certificateNo", ''), ${trimCharacters}) = '' AND TRIM(COALESCE("certificate_number", ''), ${trimCharacters}) = ''`,

      ]);

      cards.push({ id: "photos", title: "Products missing photographs", count: photos, href: "/reports/missing-media", detail: "In-stock products without a primary image or image media.", priority: "attention", affected: ["In-stock inventory · review affected SKUs in the report"], updatedAt });

      cards.push({ id: "certificates", title: "Products missing certificate numbers", count: Number(certificates[0].count), href: "/reports/missing-media", detail: "Both certificate number fields are empty, matching the existing report.", priority: "attention", affected: ["In-stock inventory · review affected SKUs in the report"], updatedAt });

    } catch { unavailable.push("Inventory readiness"); }

    try {

      await ensureReportExportJobSchema();

      const count = await prisma.reportExportJob.count({ where: { requestedById: userId, status: "FAILED" } });

      cards.push({ id: "exports", title: "Your failed exports", count, href: "/reports/ops", detail: "Saved export jobs with a verified failed status.", priority: "warning", affected: ["Your report export jobs"], updatedAt });

    } catch { unavailable.push("Report exports"); }

  }

  if (listings) {

    try {

      await ensureMarketplaceFoundationSchema();

      await ensureNotificationSchema();
      const staleBefore = new Date(Date.now() - 120000);
      const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count FROM "MarketplaceSyncJob" job
        WHERE job."requestedById" = ${userId}
          AND (job."status" IN ('FAILED', 'PARTIAL') OR (job."status" = 'PROCESSING' AND job."updatedAt" < ${staleBefore}))
          AND NOT EXISTS (SELECT 1 FROM "Notification" notice WHERE notice."userId" = ${userId}
            AND notice."eventKey" = 'marketplace-sync:' || job."id" AND notice."resolvedAt" IS NOT NULL)`;
      const count = Number(rows[0].count);
      cards.push({ id: "marketplace", title: "Your marketplace jobs requiring review", count, href: "/marketplace-sync-history", detail: "Failed, partial or processing without an update for over two minutes. Review history for recovery attempts.", priority: "warning", affected: ["Your marketplace sync jobs"], updatedAt });

    } catch { unavailable.push("Marketplace jobs"); }

  }

  return { cards, unavailable, updatedAt };

}

