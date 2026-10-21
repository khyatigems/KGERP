import { prisma } from "@/lib/prisma";
import { readSettings } from "@/lib/weekly-report/service";
import { collectMetrics } from "@/lib/weekly-report/metrics";
import { createRun, generateRun } from "@/lib/weekly-report/service";
import { mkdir, writeFile } from "node:fs/promises";
async function main() {
 const { settings } = await readSettings();
 const runs = await prisma.weeklyReportRun.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, mode: true, status: true, errorSummary: true, createdAt: true, pdfBytes: true } });
 const invoices = await prisma.invoice.findMany({ take: 4, orderBy: { createdAt: "desc" }, select: { invoiceNumber: true, invoiceCurrency: true, totalAmount: true, conversionRate: true, totalInrValue: true } });
 const metrics = await collectMetrics(settings, new Date());
 console.log(JSON.stringify({ runs, invoices, config: { logo: settings.logo, charts: settings.charts, detailedSkus: settings.detailedSkus }, metrics: { period: metrics.period, inventory: metrics.inventory, shops: metrics.shops, current: metrics.current, coverage: metrics.coverage } }, null, 2));
 if (process.argv.includes("--generate-preview")) {
  const run = await createRun("PREVIEW", { ...settings, logo: "COMPANY" });
  const generated = await generateRun(run.id);
  if (!generated.pdfBase64) throw new Error(`${generated.status}: ${generated.errorSummary}`);
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/KhyatiGems-weekly-audited-preview.pdf", Buffer.from(generated.pdfBase64, "base64"));
  console.log(`Preview persisted: ${generated.id}, ${generated.status}, ${generated.pdfBytes} bytes. No email sent.`);
 }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
