import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

async function main() {
  const filename = resolve("tmp/trading-dashboard-test.db");
  mkdirSync(resolve("tmp"), { recursive: true });
  if (existsSync(filename)) unlinkSync(filename);
  process.env.DATABASE_URL = `file:${filename.replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_URL = "";
  const fixture = createClient({ url: pathToFileURL(filename).href });
  await fixture.executeMultiple(execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", { encoding: "utf8", env: process.env }));
  fixture.close();
  const { prisma } = await import("../../lib/prisma");
  const { getTradingDashboard, visibleActivityChanges } = await import("../../lib/trading-dashboard");
  const { PERMISSIONS } = await import("../../lib/permissions");
  try {
    const admin = await prisma.user.create({ data: { name: "Admin fixture", email: "admin@example.test", password: "fixture", role: "SUPER_ADMIN" } });
    const role = await prisma.role.create({ data: { name: "Restricted fixture" } });
    const staff = await prisma.user.create({ data: { name: "Staff fixture", email: "staff@example.test", password: "fixture", role: "STAFF", roleId: role.id } });
    const permission = await prisma.permission.create({ data: { key: PERMISSIONS.INVENTORY_VIEW, module: "inventory", action: "view" } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    const stock = await prisma.inventory.create({ data: { sku: "RUBY", itemName: "Ruby", category: "Loose", gemType: "Ruby", costPrice: 50, sellingPrice: 100, status: "IN_STOCK" } });
    await prisma.inventory.create({ data: { sku: "EMERALD", itemName: "Emerald", category: "Loose", gemType: "Emerald", costPrice: 100, sellingPrice: 200, imageUrl: "https://example.test/gem.jpg", description: "Prepared gemstone", status: "IN_STOCK" } });
    const connection = await prisma.marketplaceConnection.create({ data: { marketplace: "EBAY", status: "CONNECTED" } });
    const ebay = await prisma.marketplaceShop.create({ data: { connectionId: connection.id, marketplace: "EBAY", externalShopId: "ebay", name: "eBay shop" } });
    const etsy = await prisma.marketplaceShop.create({ data: { connectionId: connection.id, marketplace: "ETSY", externalShopId: "etsy", name: "Etsy shop" } });
    for (const shop of [ebay, etsy]) await prisma.listing.create({ data: { inventoryId: stock.id, marketplaceShopId: shop.id, platform: shop.marketplace, listedPrice: 100, status: "ACTIVE" } });
    await prisma.listing.create({ data: { marketplaceShopId: ebay.id, platform: "EBAY", listedPrice: 100, status: "DRAFT", syncStatus: "ERROR", syncError: "Fixture error" } });
    for (const [number, invoiceType, currency, paymentStatus, status, invoiceDate] of [
      ["TEST-EXPORT", "EXPORT_INVOICE", "USD", "PAID", "ISSUED", new Date()],
      ["TEST-TAX", "TAX_INVOICE", "INR", "UNPAID", "ISSUED", new Date()],
      ["TEST-DRAFT", "EXPORT_INVOICE", "USD", "UNPAID", "DRAFT", new Date()],
      ["TEST-OLD", "EXPORT_INVOICE", "USD", "PAID", "ISSUED", new Date("2020-01-01")],
    ] as const) await prisma.invoice.create({ data: { invoiceNumber: number, invoiceType, invoiceCurrency: currency, paymentStatus, status, invoiceDate, subtotal: 100, taxTotal: 0, discountTotal: 0, totalAmount: 100 } });
    const started = performance.now();
    const data = await getTradingDashboard(admin.id, true);
    const elapsed = performance.now() - started;
    assert.deepEqual(data.unavailable, []);
    assert.equal(data.invoices?.recent.some(row => row.number === "TEST-DRAFT"), false);
    assert.equal(data.invoices?.export, 1);
    assert.equal(data.invoices?.tax, 1);
    assert.equal(data.invoices?.unpaid, 1);
    assert.equal(data.invoices?.recent.find(row => row.number === "TEST-EXPORT")?.type, "EXPORT");
    assert.equal(data.invoices?.recent.find(row => row.number === "TEST-TAX")?.type, "TAX");
    assert.equal(data.invoices?.recent.find(row => row.number === "TEST-TAX")?.currency, "INR");
    assert.equal(data.inventory?.total, 2);
    assert.equal(data.inventory?.listed, 1, "Cross-listed gemstones count once in stock coverage");
    assert.equal(data.inventory?.preparedUnlisted, 1);
    assert.equal(data.marketplace?.total, 2, "Channel listings count separately");
    assert.equal(data.marketplace?.shops.find(shop => shop.id === ebay.id)?.errors, 1);
    assert.equal(data.marketplace?.shops.find(shop => shop.id === ebay.id)?.drafts, 1);
    const restricted = await getTradingDashboard(staff.id);
    assert.equal(restricted.inventory?.total, 2);
    assert.equal(restricted.inventory?.listed, null);
    assert.equal(restricted.marketplace, null);
    assert.equal(restricted.invoices, null);
    assert.equal(restricted.access.teamActivity, false);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    assert.equal((await getTradingDashboard(staff.id)).inventory, null, "Revocation must bypass previously authorized cache");
    const changes = JSON.stringify({ changes: { password: { old: "secret", new: "secret2" }, costPrice: { old: 50, new: 60 }, status: { old: "IN_STOCK", new: "SOLD" } } });
    assert.deepEqual(visibleActivityChanges(changes, false).map(change => change.field), ["status"]);
    assert.equal(visibleActivityChanges(changes, true).length, 2);
    console.log(`Trading dashboard: distinct coverage, channel totals, preparation filters, sync errors, permission revocation and safe activity passed (${elapsed.toFixed(0)} ms local fixture load)`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
