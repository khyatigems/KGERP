import { NextRequest, NextResponse } from "next/server";
import { ensureActivityLogSchema, hasTable, prisma } from "@/lib/prisma";
import type { ActivityLog } from "@prisma/client";

export const revalidate = 60;

let activitySchemaReady = false;
let activitySchemaCheckedAt = 0;
const SCHEMA_CHECK_TTL = 5 * 60 * 1000;

async function ensureActivitySchemaCached() {
  const now = Date.now();
  if (activitySchemaReady && (now - activitySchemaCheckedAt) < SCHEMA_CHECK_TTL) return true;
  try {
    await ensureActivityLogSchema();
    activitySchemaReady = true;
    activitySchemaCheckedAt = now;
    return true;
  } catch {
    return false;
  }
}

let activityTableExists: boolean | null = null;
let activityTableCheckedAt = 0;

async function hasActivityTableCached() {
  const now = Date.now();
  if (activityTableExists !== null && (now - activityTableCheckedAt) < SCHEMA_CHECK_TTL) return activityTableExists;
  activityTableExists = await hasTable("ActivityLog");
  activityTableCheckedAt = now;
  return activityTableExists;
}

export async function GET(request: NextRequest) {
  try {
      await ensureActivitySchemaCached();
      const ok = await hasActivityTableCached();
      if (!ok) return NextResponse.json(request.nextUrl.searchParams.get("stats") === "true" ? { total: 0, byAction: {}, byEntity: {} } : []);

      const isStats = request.nextUrl.searchParams.get("stats") === "true";

      if (isStats) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const rows = await prisma.activityLog.findMany({
            where: {
              createdAt: { gte: thirtyDaysAgo },
              // Sync queueing and shop connection events are operational
              // telemetry, not dashboard business activity. They remain in
              // Sync History and Marketplace Control Center.
              module: { not: "MARKETPLACE" },
              actionType: { not: null, notIn: ["PUBLIC_VIEW", "QR_SCAN"] },
              entityType: { not: null },
            },
            select: { actionType: true, entityType: true },
        }).catch(() => []);

        const byAction: Record<string, number> = {};
        const byEntity: Record<string, number> = {};
        for (const row of rows) {
            const action = displayAction(row.actionType || "");
            const entity = displayEntity(row.entityType || "");
            if (!action || !entity) continue;
            byAction[action] = (byAction[action] || 0) + 1;
            byEntity[entity] = (byEntity[entity] || 0) + 1;
        }

        return NextResponse.json({ total: rows.length, byAction, byEntity });
      }

      const logs = await prisma.activityLog.findMany({
          take: 50,
          where: {
            module: { not: "MARKETPLACE" },
            actionType: { notIn: ["PUBLIC_VIEW", "QR_SCAN"] }
          },
          orderBy: { createdAt: "desc" }
      });

      const emailIds = [...new Set(logs
        .filter((log) => log.module?.toLowerCase() === "communication" || log.entityType?.toLowerCase() === "emaillog")
        .map((log) => log.referenceId || log.entityId)
        .filter((id): id is string => Boolean(id)))];
      const invoiceIds = [...new Set(logs
        .filter((log) => log.entityType?.toLowerCase() === "invoice")
        .map((log) => log.entityId || log.referenceId)
        .filter((id): id is string => Boolean(id)))];
      const [emails, invoices] = await Promise.all([
        emailIds.length
          ? prisma.emailLog.findMany({
              where: { id: { in: emailIds } },
              select: { id: true, subject: true, emailType: true, orderId: true },
            })
          : [],
        invoiceIds.length
          ? prisma.invoice.findMany({
              where: { id: { in: invoiceIds } },
              select: { id: true, invoiceNumber: true },
            })
          : [],
      ]);
      const emailById = new Map(emails.map((email) => [email.id, email]));
      const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

      const mappedLogs = logs.map((log: ActivityLog) => {
          const action = log.action || log.actionType || "";
          const email = emailById.get(log.referenceId || log.entityId || "");
          const invoice = invoiceById.get(log.entityId || log.referenceId || "");
          const metadata = parseMetadata(log.metadata || log.fieldChanges);
          const isInboxSync = action.toLowerCase() === "inbox.sync";
          const isEmail = Boolean(email) || action.toLowerCase().startsWith("email.");
          const details = (log.description || log.details || "").trim();
          let identifier = "";
          let eventAction = displayAction(action);
          let entity = displayEntity(log.entityType || log.module || "");

          if (isInboxSync) {
            entity = "Inbox";
            const result = metadata as { error?: unknown; found?: unknown; processed?: unknown; updated?: unknown; failed?: unknown } | null;
            if (result?.error) {
              const found = Number(result.found) || 0;
              const processed = Number(result.processed) || 0;
              const updated = Number(result.updated) || 0;
              const failed = Number(result.failed) || 0;
              eventAction = failed > 0 && processed + updated > 0 ? "SYNC PARTIAL" : "SYNC FAILED";
              identifier = found > 0
                ? `${found} found, ${processed} imported, ${updated} updated, ${failed} failed`
                : "Inbox synchronization failed";
            } else if (result) {
              eventAction = Number(result.failed) > 0 ? "SYNC PARTIAL" : "SYNC";
              identifier = `${Number(result.found) || 0} found, ${Number(result.processed) || 0} imported, ${Number(result.updated) || 0} updated, ${Number(result.failed) || 0} failed`;
            } else {
              eventAction = "SYNC";
              identifier = "Inbox synchronization completed";
            }
          } else if (isEmail) {
            entity = "Email";
            identifier = email?.subject?.trim() ? `Subject: ${email.subject.trim()}` : details || "Email activity";
            if (action.toLowerCase() === "email.mark_read") eventAction = "OPENED";
            else if (action.toLowerCase() === "email.send" && String(metadata?.resultStatus || "").toUpperCase() === "FAILED") eventAction = "SEND FAILED";
          } else if (entity === "Invoice") {
            identifier = invoice?.invoiceNumber || safeIdentifier(log.entityIdentifier) || "Invoice activity";
            if (/payment status reset|payment entries removed/i.test(details)) eventAction = "PAYMENT RESET";
            else if (
              eventAction === "EDIT" &&
              (/payment|balance/i.test(details) ||
                hasPaymentMetadata(metadata))
            ) {
              eventAction = "PAYMENT UPDATED";
            } else if (eventAction === "EDIT") {
              eventAction = "UPDATED";
            }
          }

          if (!identifier) {
            identifier = details || safeIdentifier(log.entityIdentifier) || `${entity} activity`;
          }

          return {
            id: log.id,
            entityType: entity || "Activity",
            actionType: eventAction || "UPDATED",
            entityIdentifier: identifier,
            timestamp: log.createdAt,
            userName: log.userName && log.userName !== "Unknown" ? log.userName : "Team member",
          };
      });

      return NextResponse.json(mappedLogs);
  } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("no such table") || msg.includes("no such column") || msg.includes("SQLITE_UNKNOWN") || msg.includes("SQL_INPUT_ERROR")) {
        activityTableExists = false;
        activityTableCheckedAt = Date.now();
        return NextResponse.json(request.nextUrl.searchParams.get("stats") === "true" ? { total: 0, byAction: {}, byEntity: {} } : []);
      }

      console.error("Activity fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function safeIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const identifier = value.trim();
  if (!identifier || identifier.toLowerCase() === "unknown") return null;
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(identifier) || /^c[a-z0-9]{20,}$/i.test(identifier)) return null;
  return identifier;
}

function hasPaymentMetadata(metadata: Record<string, unknown> | null): boolean {
  if (!metadata) return false;
  const paymentFields = ["paymentStatus", "paidAmount", "payment"];
  if (paymentFields.some((key) => key in metadata)) return true;
  const changes = metadata.changes;
  return Boolean(
    changes &&
    typeof changes === "object" &&
    !Array.isArray(changes) &&
    paymentFields.some((key) => key in changes)
  );
}

function displayEntity(value: string): string {
  const key = value.trim().toLowerCase();
  if (!key || key === "unknown") return "";
  if (key === "communication") return "Communication";
  if (key === "emaillog" || key === "email") return "Email";
  if (key === "inbox") return "Inbox";
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayAction(value: string): string {
  const key = value.toLowerCase();
  if (!key || key === "unknown") return "";
  if (key === "inbox.sync") return "SYNC";
  if (key === "email.send") return "SENT";
  if (key === "email.schedule") return "SCHEDULED";
  if (key === "email.draft.create") return "DRAFT";
  if (key === "email.mark_read") return "OPENED";
  if (key === "email.mark_unread") return "UNREAD";
  if (key === "whatsapp.invoice.launch") return "SENT";
  return value.replace(/[._]/g, " ").replace(/_/g, " ").toUpperCase();
}
