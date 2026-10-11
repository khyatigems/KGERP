import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { parseDimensions, productFactsKey, productFactsSchema } from "../lib/inventory-product-facts";
loadEnvConfig(process.cwd());
Object.assign(process.env, { NODE_ENV: "production" });
async function main() {
 const { prisma } = await import("../lib/prisma");
 const apply = process.argv.includes("--apply");
 try {
  const items = await prisma.inventory.findMany({ where: { dimensionsMm: { not: null } }, select: { id: true, dimensionsMm: true } });
  const planned: Array<{ id: string; original: string; dimensions: NonNullable<ReturnType<typeof parseDimensions>>; previous: string | null }> = [];
  let skipped = 0, existing = 0;
  for (const item of items) {
   if (!item.dimensionsMm?.trim()) continue;
   const dimensions = parseDimensions(item.dimensionsMm);
   if (!dimensions) { skipped++; continue; }
   const saved = await prisma.setting.findUnique({ where: { key: productFactsKey(item.id) }, select: { value: true } });
   const facts = saved ? productFactsSchema.parse(JSON.parse(saved.value)) : productFactsSchema.parse({});
   if (facts.lengthMm || facts.widthMm || facts.breadthMm) { existing++; continue; }
   planned.push({ id: item.id, original: item.dimensionsMm, dimensions, previous: saved?.value || null });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", eligible: planned.length, unparseable: skipped, alreadyStructured: existing }));
  if (!apply) return;
  await mkdir("backups/inventory-dimensions", { recursive: true });
  const backup = `backups/inventory-dimensions/${new Date().toISOString().replaceAll(":", "-")}.json`;
  await writeFile(backup, JSON.stringify(planned, null, 2));
  let applied = 0;
  for (const row of planned) {
   await prisma.$transaction(async (tx) => {
    const item = await tx.inventory.findUnique({ where: { id: row.id }, select: { dimensionsMm: true } });
    const saved = await tx.setting.findUnique({ where: { key: productFactsKey(row.id) } });
    if (item?.dimensionsMm !== row.original || (saved?.value || null) !== row.previous) throw new Error("Inventory changed during backfill; stopped without overwriting that item.");
    const facts = productFactsSchema.parse(saved ? JSON.parse(saved.value) : {});
    const key = productFactsKey(row.id), value = JSON.stringify({ ...facts, ...row.dimensions });
    await tx.setting.upsert({ where: { key }, create: { key, value, description: "Shared inventory product facts; dimensions backfilled from L x W x B" }, update: { value } });
   });
   applied++;
  }
  console.log(`Backfilled ${applied} items. Original Inventory dimensions and all other columns are unchanged. Backup: ${backup}`);
 } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Backfill failed"); process.exitCode = 1; });
