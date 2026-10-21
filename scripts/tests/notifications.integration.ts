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
    console.log("Notification integration passed: unique event deduplication, user isolation, persistent read state and immutable duplicate delivery.");
  } finally {
    await prisma.$disconnect();
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
