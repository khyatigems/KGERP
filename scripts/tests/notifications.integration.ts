import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { NextRequest } from "next/server";
import { routeNotification } from "@/lib/notification-routing";
import { safeErrorMessage } from "@/lib/erp-feedback";

async function main() {
  assert.equal(routeNotification("routine_success"), "toast");
  assert.equal(routeNotification("recoverable_error"), "toast");
  assert.equal(routeNotification("contextual_warning"), "inline");
  assert.equal(routeNotification("important_activity"), "persistent");
  assert.equal(routeNotification("operational_failure"), "persistent");
  assert.equal(safeErrorMessage("Prisma P2021: SQL error: no such table"), "The action could not be completed. Please try again.");
  assert.equal(safeErrorMessage("Duplicate mobile number"), "Duplicate mobile number");
  const temp = mkdtempSync(path.join(tmpdir(), "kg-notifications-"));
  process.env.DATABASE_URL = `file:${path.join(temp, "test.db").replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_URL = "";
  const { prisma } = await import("@/lib/prisma");
  try {
    const baseline = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
    for (const statement of baseline.split(";").map((part) => part.replace(/--[^\n]*/g, "").trim()).filter(Boolean)) {
      if (!/CREATE (?:TABLE|UNIQUE INDEX|INDEX) "Notification/.test(statement)) await prisma.$executeRawUnsafe(statement);
    }
    const { ensureNotificationSchema, persistNotification } = await import("@/lib/notifications");
    await ensureNotificationSchema();
    const migration = readFileSync("prisma/migrations/20261020030000_add_notifications/migration.sql", "utf8");
    for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    const parity = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-url", process.env.DATABASE_URL!, "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
    assert.match(parity, /empty migration/, "the additive SQL migration matches the Prisma schema");
    await prisma.$executeRawUnsafe(`INSERT INTO "User" ("id", "name", "email", "password", "role") VALUES ('actor-a', 'Actor A', 'a@example.test', 'unused', 'USER'), ('actor-b', 'Actor B', 'b@example.test', 'unused', 'USER'), ('actor-c', 'Actor C', 'c@example.test', 'unused', 'USER')`);
    const { routeNotification } = await import("@/lib/notification-routing");
    assert.equal(routeNotification("routine_success"), "toast");
    assert.equal(routeNotification("recoverable_error"), "toast");
    assert.equal(routeNotification("contextual_warning"), "inline");
    assert.equal(routeNotification("important_activity"), "persistent");
    assert.equal(routeNotification("operational_failure"), "persistent");
    const event = { userId: "actor-a", eventKey: "sale-created:invoice-a", delivery: "important_activity" as const, severity: "success" as const, title: "Sale recorded", message: "Invoice A was recorded", href: "/invoices/invoice-a" };
    const first = await persistNotification(event);
    const duplicate = await persistNotification({ ...event, message: "Duplicate poll must not rewrite event" });
    assert.equal(first?.id, duplicate?.id, "duplicate events reuse the same persisted row");
    assert.equal(await prisma.notification.count({ where: { userId: "actor-a" } }), 1);
    assert.equal(await prisma.notification.count({ where: { userId: "actor-b" } }), 0, "events are scoped to the intended user");
    await persistNotification({ ...event, userId: "actor-b", eventKey: "marketplace-sync:job-b", message: "Shop B failed" });
    const { handleNotificationsGet, handleNotificationsPatch } = await import("@/app/api/notifications/route");
    const unauthorized = await handleNotificationsGet(new NextRequest("https://erp.test/api/notifications"), async () => null);
    assert.equal(unauthorized.status, 401, "unauthenticated users cannot read notifications");
    const actorAResponse = await handleNotificationsGet(new NextRequest("https://erp.test/api/notifications"), async () => ({ user: { id: "actor-a" } }));
    const actorAData = await actorAResponse.json() as { items: Array<{ id: string; userId: string }> };
    assert.equal(actorAData.items.length, 1, "the API returns only the authenticated user's notifications");
    assert.equal(actorAData.items[0].userId, "actor-a");
    const crossUserRead = await handleNotificationsPatch(new NextRequest("https://erp.test/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: (await prisma.notification.findFirstOrThrow({ where: { userId: "actor-b" } })).id }) }), async () => ({ user: { id: "actor-a" } }));
    assert.equal(crossUserRead.status, 200);
    assert.equal(await prisma.notification.count({ where: { userId: "actor-b", readAt: null } }), 1, "users cannot change another user's read state");
    await prisma.activityLog.create({ data: { entityType: "Inventory", entityId: "inventory-c", entityIdentifier: "SKU-C", actionType: "CREATE", source: "WEB", userId: "actor-c" } });
    const actorCResponse = await handleNotificationsGet(new NextRequest("https://erp.test/api/notifications"), async () => ({ user: { id: "actor-c" } }));
    const actorCData = await actorCResponse.json() as { items: Array<{ eventKey: string; message: string }> };
    assert.equal(actorCData.items.length, 1, "an empty bell is populated from recent successful activity history");
    assert.equal(actorCData.items[0].eventKey, "inventory-created:inventory-c");
    await prisma.notification.updateMany({ where: { id: first!.id, userId: "actor-a", readAt: null }, data: { readAt: new Date() } });
    assert.equal(await prisma.notification.count({ where: { userId: "actor-a", readAt: null } }), 0, "read state persists");
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: first!.id } })).message, "Invoice A was recorded", "duplicate delivery preserves original event contents");
    for (let index = 0; index < 3; index++) await persistNotification({ ...event, eventKey: `cursor-test:${index}`, createdAt: new Date("2026-10-26T00:00:00Z") });
    const pagedIds = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const response = await handleNotificationsGet(new NextRequest(`https://erp.test/api/notifications?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`), async () => ({ user: { id: "actor-a" } }));
      const data = await response.json() as { items: Array<{ id: string; userId: string }>; nextCursor: string | null; hasMore: boolean };
      for (const item of data.items) { assert.equal(item.userId, "actor-a"); assert.equal(pagedIds.has(item.id), false, "cursor pages do not repeat records"); pagedIds.add(item.id); }
      if (!data.hasMore) break;
      cursor = data.nextCursor;
      assert.ok(cursor);
    }
    assert.equal(pagedIds.size, 4, "cursor includes every record even with identical timestamps");
    const patch = (body: unknown, actor = "actor-a") => handleNotificationsPatch(new NextRequest("https://erp.test/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), async () => ({ user: { id: actor } }));
    assert.equal((await patch({ id: first!.id, action: "resolve" })).status, 400, "clients cannot resolve business issues");
    assert.equal((await patch({ all: "false" })).status, 400, "truthy strings cannot trigger bulk updates");
    assert.equal((await patch({ id: first!.id, action: "snooze", minutes: -1 })).status, 400);
    assert.equal((await patch({ ids: [], action: "acknowledge" })).status, 400);
    assert.equal((await patch({ id: first!.id, action: "acknowledge" })).status, 200);
    const acknowledged = await prisma.notification.findUniqueOrThrow({ where: { id: first!.id } });
    assert.ok(acknowledged.readAt && acknowledged.acknowledgedAt);
    assert.equal(acknowledged.resolvedAt, null, "acknowledgement is not verified recovery");
    assert.equal((await patch({ id: first!.id, action: "snooze", minutes: 60 })).status, 200);
    assert.ok((await prisma.notification.findUniqueOrThrow({ where: { id: first!.id } })).snoozedUntil);
    const foreign = await prisma.notification.findFirstOrThrow({ where: { userId: "actor-b" } });
    await patch({ ids: [first!.id, foreign.id], action: "acknowledge" });
    await patch({ id: foreign.id, action: "snooze", minutes: 60 });
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: foreign.id } })).acknowledgedAt, null);
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: foreign.id } })).snoozedUntil, null);
    const search = async (params: string) => (await handleNotificationsGet(new NextRequest(`https://erp.test/api/notifications?${params}`), async () => ({ user: { id: "actor-a" } }))).json();
    assert.equal((await search("q=Invoice%20A&state=acknowledged&severity=success&category=sale")).items.length, 1, "server search composes status, severity and category");
    assert.equal((await search("q=Shop%20B")).items.length, 0, "server search never leaks another user’s events");
    assert.equal((await search("state=resolved")).items.length, 0);
    await persistNotification({ ...event, eventKey: "old-search-target", title: "Archived unique search target", createdAt: new Date("2020-01-01") });
    assert.equal((await search("q=Archived%20unique&limit=1")).items.length, 1, "server search finds records beyond the first history page");
    const { resolveMarketplaceNotificationSafely } = await import("@/lib/notifications");
    await prisma.marketplaceConnection.create({ data: { id: "connection-test", marketplace: "ETSY" } });
    await prisma.marketplaceShop.create({ data: { id: "shop-test", marketplace: "ETSY", connectionId: "connection-test", externalShopId: "test", name: "Test shop" } });
    await prisma.marketplaceSyncJob.createMany({ data: [
      { id: "original-failure", marketplaceShopId: "shop-test", syncType: "LISTINGS", requestedById: "actor-a", status: "FAILED" },
      { id: "retry-job", marketplaceShopId: "shop-test", syncType: "LISTINGS", requestedById: "actor-a", status: "QUEUED" },
    ] });
    const issue = await persistNotification({ ...event, eventKey: "marketplace-sync:original-failure", severity: "error" });
    await prisma.setting.create({ data: { key: "notification-recovery:retry-job", value: JSON.stringify(["original-failure"]) } });
    await resolveMarketplaceNotificationSafely("retry-job");
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: issue!.id } })).resolvedAt, null, "queuing a retry does not resolve the failure");
    await prisma.marketplaceSyncJob.update({ where: { id: "retry-job" }, data: { status: "PARTIAL", recordsFailed: 1 } });
    await resolveMarketplaceNotificationSafely("retry-job");
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: issue!.id } })).resolvedAt, null, "partial recovery does not resolve the failure");
    await prisma.marketplaceSyncJob.update({ where: { id: "retry-job" }, data: { status: "SUCCESS", recordsFailed: 0 } });
    await resolveMarketplaceNotificationSafely("retry-job");
    assert.ok((await prisma.notification.findUniqueOrThrow({ where: { id: issue!.id } })).resolvedAt, "only stored verified success resolves the original issue");
    const { getCompanionAttention } = await import("@/lib/companion-attention");
    assert.equal((await getCompanionAttention("actor-b")).cards.length, 0, "staff without source permission receive no business cards");
    await prisma.user.update({ where: { id: "actor-a" }, data: { role: "SUPER_ADMIN" } });
    await prisma.inventory.createMany({ data: [
      { sku: "readiness-empty", itemName: "Missing details", category: "GEMSTONE", costPrice: 1, sellingPrice: 2, certificateNo: "\t \n\u00a0" },
      { sku: "readiness-complete", itemName: "Ready", category: "GEMSTONE", costPrice: 1, sellingPrice: 2, certificateNo: "CERT-1", imageUrl: "/photo.jpg" },
      { sku: "readiness-sold", itemName: "Sold", category: "GEMSTONE", costPrice: 1, sellingPrice: 2, status: "SOLD" },
    ] });
    const attention = await getCompanionAttention("actor-a");
    assert.equal(attention.unavailable.length, 0);
    assert.equal(attention.cards.find(card => card.id === "photos")?.count, 1);
    assert.equal(attention.cards.find(card => card.id === "certificates")?.count, 1, "whitespace certificate fields follow the existing report rule");
    await prisma.notification.createMany({ data: Array.from({ length: 1000 }, (_, index) => ({ userId: "actor-a", eventKey: `history-load:${index}`, title: index === 777 ? "Unique history needle" : "History volume fixture", message: "Verified fixture event", createdAt: new Date("2025-01-01") })) });
    const started = Date.now();
    const historySearch = await search("q=Unique%20history%20needle&limit=1000");
    assert.equal(historySearch.items.length, 1, "server search finds one record in a thousand-row fixture");
    assert.equal(historySearch.items[0].eventKey, "history-load:777");
    assert.ok((await search("q=History%20volume&limit=1000")).items.length <= 50, "large history remains server-bounded");
    console.log(`Thousand-row history search smoke: ${Date.now() - started}ms (local fixture, not a production baseline).`);
    const malformed = await handleNotificationsGet(new NextRequest("https://erp.test/api/notifications?cursor=invalid"), async () => ({ user: { id: "actor-a" } }));
    assert.equal(malformed.status, 400);
    console.log("Notification integration passed: unique event deduplication, user isolation, persistent read state and immutable duplicate delivery.");
  } finally {
    await prisma.$disconnect();
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
